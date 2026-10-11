import "server-only"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { eq, and, desc, sql, ne, gte, isNull, inArray } from "drizzle-orm"
import { headers } from "next/headers"
import {
  load,
  trip,
  driver,
  truck,
  trailer,
  invoice,
  payStub,
  apExpense,
  carrierPayment,
  organization,
  member,
  invitation,
  user,
  signupAttempt,
  systemSetting,
  session as sessionTable,
  errorLog,
  auditLog,
  account as accountTable,
} from "@/lib/schema"
import { listAuditEvents } from "@/lib/audit"
import { cache } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// ROLE RESOLUTION (platform + workspace, kept distinct)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolved role view for a user. Distinguishes the platform role
 * (user.role) from per-workspace roles (member.role) so the admin
 * UI can show both without conflating them.
 */
export type ResolvedRole = {
  userId: string
  email: string
  name: string
  image: string | null
  /** Platform role — `"user" | "admin"` from Better Auth's admin plugin. */
  platformRole: "user" | "admin" | null
  /**
   * Per-workspace roles — one per (user, organization) membership.
   * Values: `"owner" | "admin" | "member" | "operations_manager" |
   * "dispatcher" | "accounting" | "driver" | "safety"`.
   */
  workspaceMemberships: {
    organizationId: string
    organizationName: string
    organizationSlug: string
    role: string
    createdAt: Date
  }[]
  /** The currently-active org on the user's session, if any. */
  activeOrganizationId: string | null
}

export const resolveUserRoles = cache(
  async (userId: string): Promise<ResolvedRole | null> => {
    console.log(`[DAL] resolveUserRoles ${userId}`)
    const [u] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    if (!u) return null

    const memberships = await db
      .select({
        organizationId: member.organizationId,
        role: member.role,
        createdAt: member.createdAt,
        orgName: organization.name,
        orgSlug: organization.slug,
      })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, userId))

    const session = await getSession()
    const activeOrganizationId =
      (session?.session as any)?.activeOrganizationId ?? null

    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      platformRole: (u.role as "user" | "admin" | null) ?? "user",
      workspaceMemberships: memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.orgName,
        organizationSlug: m.orgSlug,
        role: m.role,
        createdAt: m.createdAt,
      })),
      activeOrganizationId,
    }
  }
)

/** Lists every user with both role views in a single query — powers
 *  the admin "Change role" Sheet's user picker and the user detail
 *  page. Bounded to first 200 users. */
export const listUsersWithResolvedRoles = cache(
  async (opts: { search?: string; limit?: number; offset?: number } = {}) => {
    const limit = Math.min(opts.limit ?? 50, 200)
    const offset = opts.offset ?? 0
    const needle = opts.search?.trim().toLowerCase()
    console.log(
      `[DAL] listUsersWithResolvedRoles search=${needle ?? "(none)"} limit=${limit} offset=${offset}`
    )
    const conditions = []
    if (needle) {
      conditions.push(
        sql`(LOWER(${user.email}) LIKE ${`%${needle}%`} OR LOWER(${user.name}) LIKE ${`%${needle}%`})`
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined
    const rows = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        platformRole: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset)
    return { users: rows, total: rows.length }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export const getSession = cache(async () => {
  const headersList = await headers()
  return auth.api.getSession({ headers: headersList })
})

export const getCurrentUser = cache(async () => {
  const session = await getSession()
  return session?.user ?? null
})

export const getActiveOrganizationId = cache(async (): Promise<string | null> => {
  const session = await getSession()
  return session?.session?.activeOrganizationId ?? null
})

/** Thrown by requireTenant() when there is no usable tenant context.
 *  Route handlers map these to HTTP status codes via tenantErrorResponse(). */
export class TenantError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "NO_ACTIVE_ORGANIZATION" | "FORBIDDEN",
    message?: string
  ) {
    super(message ?? code)
    this.name = "TenantError"
  }
}

/**
 * Ensures we have a valid user and active organization, AND that
 * the user is not currently suspended from this workspace (WS-26).
 *
 * Platform admins (`user.role='admin'`) bypass the suspension check
 * so they can still inspect suspended workspaces.
 *
 * Use this in any Server Action or Route Handler that touches
 * tenant data — it gives the same gate as the dashboard layout.
 */
export async function requireTenant() {
  const session = await getSession()
  if (!session?.user) {
    throw new TenantError("UNAUTHORIZED")
  }
  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    throw new TenantError("NO_ACTIVE_ORGANIZATION")
  }

  // WS-26 — workspace-scoped suspension gate. Skip for platform admins.
  const platformRole = (session.user as any).role ?? null
  if (platformRole !== "admin") {
    const [row] = await db
      .select({
        suspendedAt: member.suspendedAt,
        suspendedUntil: member.suspendedUntil,
      })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, orgId),
        ),
      )
      .limit(1)
    if (
      row?.suspendedAt &&
      (!row.suspendedUntil ||
        (row.suspendedUntil as Date) > new Date())
    ) {
      console.log(
        `[DAL] requireTenant: user=${session.user.id} suspended from org=${orgId} → FORBIDDEN`,
      )
      throw new TenantError("FORBIDDEN")
    }
  }

  return {
    userId: session.user.id,
    userRole: platformRole,
    tenantId: orgId,
  }
}

const TENANT_ERROR_STATUS: Record<TenantError["code"], number> = {
  UNAUTHORIZED: 401,
  NO_ACTIVE_ORGANIZATION: 409,
  FORBIDDEN: 403,
}

/**
 * Wraps a route handler body so tenant errors become the right HTTP status
 * instead of a blanket 500. Usage:
 *
 *   export const POST = withTenant(async (req) => { ... })
 *   export const PATCH = withTenant(async (req, ctx, { params }) => { ... })
 */
export function withTenant<TReq, TCtx = unknown>(
  handler: (
    req: TReq,
    ctx: { tenantId: string; userId: string; userRole: string | null },
    routeCtx: TCtx
  ) => Promise<Response>
) {
  return async (req: TReq, routeCtx: TCtx): Promise<Response> => {
    try {
      return await handler(req, await requireTenant(), routeCtx)
    } catch (err) {
      if (err instanceof TenantError) {
        return Response.json({ error: err.code }, { status: TENANT_ERROR_STATUS[err.code] })
      }
      throw err
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADS
// ─────────────────────────────────────────────────────────────────────────────

export const getLoadsForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(load)
    .where(eq(load.tenantId, tenantId))
    .orderBy(desc(load.createdAt))
}

export const getLoadById = async (loadId: string, tenantId: string) => {
  const [result] = await db
    .select()
    .from(load)
    .where(and(eq(load.id, loadId), eq(load.tenantId, tenantId)))
    .limit(1)
  return result ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIPS
// ─────────────────────────────────────────────────────────────────────────────

export const getTripsForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(trip)
    .where(eq(trip.tenantId, tenantId))
    .orderBy(desc(trip.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────────────────────────────────────

export const getDriversForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(driver)
    .where(eq(driver.tenantId, tenantId))
    .orderBy(desc(driver.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUCKS
// ─────────────────────────────────────────────────────────────────────────────

export const getTrucksForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(truck)
    .where(eq(truck.tenantId, tenantId))
    .orderBy(desc(truck.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAILERS
// ─────────────────────────────────────────────────────────────────────────────

export const getTrailersForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(trailer)
    .where(eq(trailer.tenantId, tenantId))
    .orderBy(desc(trailer.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────────────────────

export const getInvoicesForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(invoice)
    .where(eq(invoice.tenantId, tenantId))
    .orderBy(desc(invoice.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL
// ─────────────────────────────────────────────────────────────────────────────

export const getPayStubsForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(payStub)
    .where(eq(payStub.tenantId, tenantId))
    .orderBy(desc(payStub.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// AP EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

export const getApExpensesForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(apExpense)
    .where(eq(apExpense.tenantId, tenantId))
    .orderBy(desc(apExpense.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// CARRIER PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const getCarrierPaymentsForOrg = async (tenantId: string) => {
  return db
    .select()
    .from(carrierPayment)
    .where(eq(carrierPayment.tenantId, tenantId))
    .orderBy(desc(carrierPayment.createdAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZATION
// ─────────────────────────────────────────────────────────────────────────────

export const getOrganizationById = async (orgId: string) => {
  const [result] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1)
  return result ?? null
}

export const getMembersForOrg = async (orgId: string) => {
  return db
    .select()
    .from(member)
    .where(eq(member.organizationId, orgId))
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATES / KPIs
// ─────────────────────────────────────────────────────────────────────────────

export const getActiveLoadsCount = async (tenantId: string) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(load)
    .where(and(
      eq(load.tenantId, tenantId),
      sql`${load.status} IN ('booked', 'dispatched', 'in_transit')`
    ))
  return Number(result?.count ?? 0)
}

export const getOnTimePercent = async (tenantId: string) => {
  // Delivered loads vs on-time
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(load)
    .where(and(
      eq(load.tenantId, tenantId),
      eq(load.status, "delivered")
    ))
  return Number(result?.count ?? 0)
}

export const getMonthlyRevenue = async (tenantId: string) => {
  const [result] = await db
    .select({ total: sql<string>`coalesce(sum(${invoice.amount}::numeric), 0)` })
    .from(invoice)
    .where(and(
      eq(invoice.tenantId, tenantId),
      sql`${invoice.createdAt} >= date_trunc('month', now())`
    ))
  return Number(result?.total ?? 0)
}

export const getActiveDriversCount = async (tenantId: string) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(driver)
    .where(and(
      eq(driver.tenantId, tenantId),
      eq(driver.status, "active")
    ))
  return Number(result?.count ?? 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONSOLE
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the current session's user has `role = 'admin'` in the DB.
 *  Use this for UI gating (sidebar entry, nav-user dropdown). For route
 *  protection, use `requireAdmin()` which throws `TenantError`. */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const session = await getSession()
  if (!session?.user?.id) return false
  // [DAL] admin gate is DB-based — read user.role fresh each call.
  // We don't trust the cached role on session.user because it might be
  // stale relative to a recent setRole call.
  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
  return rows[0]?.role === "admin"
})

/** Gate the /admin/* route group. Must be a signed-in user with `role = 'admin'`. */
export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) {
    throw new TenantError("UNAUTHORIZED")
  }
  const isAdmin = await getIsAdmin()
  if (!isAdmin) {
    throw new TenantError("FORBIDDEN")
  }
  return {
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? "Admin",
    userImage: session.user.image ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprehensive data layer for the /admin home page.
 *
 * Returns the KPI numbers, the deltas, the brute-force counters,
 * the impersonation status, the system health snapshot, and the
 * last 20 audit events. All counts are real (no toy values).
 */
export async function getAdminOverview(): Promise<{
  kpis: {
    totalUsers: number
    usersDelta7d: number
    totalOrgs: number
    orgsDelta7d: number
    suspended: number
    openAppeals: number
    banned: number
    pendingInvitations: number
    failedSignups24h: number
    activeSessions: number
  }
  impersonation: {
    active: boolean
    startedByEmail: string | null
  }
  systemHealth: {
    dbLatencyMs: number
    resendConfigured: boolean
    betterAuthUrlSet: boolean
    maintenanceMode: boolean
    errors24h: number
    lastErrorAt: string | null
  }
  recentEvents: Array<{
    id: string
    action: string
    actorEmail: string
    targetType: string
    targetLabel: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }>
}> {
  console.log("[DAL] getAdminOverview")
  const start = performance.now()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    totalUsersRow,
    newUsers7d,
    totalOrgsRow,
    newOrgs7d,
    suspended,
    openAppeals,
    banned,
    pendingInv,
    failedSignups24h,
    activeSessionsRow,
    errors24h,
    lastError,
    maintenanceRow,
    sessionUser,
    recentEvents,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(user),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(gte(user.createdAt, sevenDaysAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(organization),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(organization)
      .where(gte(organization.createdAt, sevenDaysAgo)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(
        and(
          sql`${user.suspendedAt} IS NOT NULL`,
          sql`(${user.suspendedUntil} IS NULL OR ${user.suspendedUntil} > NOW())`
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.appealStatus, "open")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.banned, true)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invitation)
      .where(eq(invitation.status, "pending")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(signupAttempt)
      .where(
        and(
          eq(signupAttempt.success, false),
          gte(signupAttempt.createdAt, oneDayAgo)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionTable)
      .where(gte(sessionTable.expiresAt, now)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(errorLog)
      .where(
        and(
          gte(errorLog.createdAt, oneDayAgo),
          eq(errorLog.level, "error")
        )
      ),
    db
      .select({ createdAt: errorLog.createdAt, message: errorLog.message })
      .from(errorLog)
      .orderBy(desc(errorLog.createdAt))
      .limit(1),
    db
      .select({ value: systemSetting.value })
      .from(systemSetting)
      .where(eq(systemSetting.key, "maintenance"))
      .orderBy(desc(systemSetting.updatedAt))
      .limit(1),
    getSession(),
    import("./audit").then(({ listAuditEvents }) =>
      listAuditEvents({ limit: 20, offset: 0 })
    ),
  ])

  // DB roundtrip latency probe (cheap)
  const probeStart = performance.now()
  await db.select({ ok: sql<number>`1` }).from(user).limit(1)
  const dbLatencyMs = Math.round(performance.now() - probeStart)

  const session = sessionUser
  const impersonatedBy = (session?.session as any)?.impersonatedBy ?? null

  const maintenanceValue = (maintenanceRow?.[0]?.value as any) ?? null
  const maintenanceMode = !!maintenanceValue?.enabled

  console.log(
    `[DAL] getAdminOverview done in ${Math.round(performance.now() - start)}ms`
  )

  return {
    kpis: {
      totalUsers: Number(totalUsersRow[0]?.count ?? 0),
      usersDelta7d: Number(newUsers7d[0]?.count ?? 0),
      totalOrgs: Number(totalOrgsRow[0]?.count ?? 0),
      orgsDelta7d: Number(newOrgs7d[0]?.count ?? 0),
      suspended: Number(suspended[0]?.count ?? 0),
      openAppeals: Number(openAppeals[0]?.count ?? 0),
      banned: Number(banned[0]?.count ?? 0),
      pendingInvitations: Number(pendingInv[0]?.count ?? 0),
      failedSignups24h: Number(failedSignups24h[0]?.count ?? 0),
      activeSessions: Number(activeSessionsRow[0]?.count ?? 0),
    },
    impersonation: {
      active: !!impersonatedBy,
      startedByEmail: impersonatedBy ?? null,
    },
    systemHealth: {
      dbLatencyMs,
      resendConfigured: !!process.env.RESEND_API_KEY,
      betterAuthUrlSet: !!process.env.BETTER_AUTH_URL,
      maintenanceMode,
      errors24h: Number(errors24h[0]?.count ?? 0),
      lastErrorAt: lastError[0]?.createdAt?.toISOString() ?? null,
    },
    recentEvents: recentEvents.events.map((e) => ({
      id: e.id,
      action: e.action,
      actorEmail: e.actorEmail,
      targetType: e.targetType,
      targetLabel: e.targetLabel,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONSOLE
// ─────────────────────────────────────────────────────────────────────────────

/** Counts used by the admin home dashboard. All run in parallel. */
export async function getAdminStats() {
  const [users, banned, suspended, orgs, members, invitations, appeals] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(user),
      db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(eq(user.banned, true)),
      // Suspended = suspended_at is set AND (suspended_until is null OR in the future)
      db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(
          and(
            sql`${user.suspendedAt} IS NOT NULL`,
            sql`(${user.suspendedUntil} IS NULL OR ${user.suspendedUntil} > NOW())`
          )
        ),
      db.select({ count: sql<number>`count(*)` }).from(organization),
      db.select({ count: sql<number>`count(*)` }).from(member),
      db
        .select({ count: sql<number>`count(*)` })
        .from(invitation)
        .where(eq(invitation.status, "pending")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(eq(user.appealStatus, "open")),
    ])
  return {
    totalUsers: Number(users[0]?.count ?? 0),
    bannedUsers: Number(banned[0]?.count ?? 0),
    suspendedUsers: Number(suspended[0]?.count ?? 0),
    openAppeals: Number(appeals[0]?.count ?? 0),
    totalOrgs: Number(orgs[0]?.count ?? 0),
    totalMembers: Number(members[0]?.count ?? 0),
    pendingInvitations: Number(invitations[0]?.count ?? 0),
  }
}

/** Returns every organization across all tenants (admin-only view).
 *  Includes a member count per org for the table. */
export async function getAllOrgsForAdmin() {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
      memberCount: sql<number>`(
        SELECT count(*)::int FROM ${member} WHERE ${member.organizationId} = ${organization.id}
      )`,
    })
    .from(organization)
    .orderBy(desc(organization.createdAt))
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: SINGLE-USER / SINGLE-ORG / DEDICATED DETAIL PAGES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full user record for the dedicated /admin/users/[id] page.
 * Mirrors the projection of listEnrichedUsersForAdmin but for one id.
 * Returns null if the user doesn't exist.
 *
 * Includes the "deep info" the user-detail page renders:
 *   - profile + status fields
 *   - last sign-in timestamp + last sign-in IP + last UA
 *   - active session count + total session count
 *   - distinct sign-in IPs in the last 90 days (top 10)
 *   - linked OAuth accounts (from `account` table)
 *   - signup attempt (if any — has the IP they signed up from)
 */
export async function getEnrichedUserById(id: string) {
  console.log(`[DAL] getEnrichedUserById ${id}`)
  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
      suspendedReason: user.suspendedReason,
      suspendedBy: user.suspendedBy,
      appealMessage: user.appealMessage,
      appealStatus: user.appealStatus,
      appealSubmittedAt: user.appealSubmittedAt,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      username: user.username,
      displayUsername: user.displayUsername,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)
  if (!u) return null

  // Fan out: last sign-in, session counts, distinct IPs, linked
  // accounts, signup attempt, audit count.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const [
    lastSession,
    activeSessionCountRow,
    totalSessionCountRow,
    distinctIps,
    linkedAccounts,
    signupRow,
    auditCountRow,
  ] = await Promise.all([
    // Last sign-in (most-recent session, regardless of expiry)
    db
      .select({
        createdAt: sessionTable.createdAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, id))
      .orderBy(desc(sessionTable.createdAt))
      .limit(1),
    // Active session count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionTable)
      .where(
        and(eq(sessionTable.userId, id), gte(sessionTable.expiresAt, new Date()))
      ),
    // Total session count (active + expired, all-time)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessionTable)
      .where(eq(sessionTable.userId, id)),
    // Distinct IPs in last 90 days, with first/last seen + count
    db.execute(sql`
      SELECT
        ip_address,
        MIN(created_at) AS first_seen,
        MAX(created_at) AS last_seen,
        COUNT(*)::int AS sign_in_count
      FROM ${sessionTable}
      WHERE ${sessionTable.userId} = ${id}
        AND ${sessionTable.ipAddress} IS NOT NULL
        AND ${sessionTable.createdAt} >= ${ninetyDaysAgo.toISOString()}
      GROUP BY ip_address
      ORDER BY last_seen DESC
      LIMIT 10
    ` as any),
    // Linked OAuth accounts (provider + provider account id)
    db
      .select({
        id: accountTable.id,
        providerId: accountTable.providerId,
        accountId: accountTable.accountId,
        createdAt: accountTable.createdAt,
        lastSignInAt: accountTable.updatedAt,
      })
      .from(accountTable)
      .where(eq(accountTable.userId, id))
      .orderBy(desc(accountTable.updatedAt)),
    // Signup attempt (if any) — the IP they signed up from
    db
      .select({
        id: signupAttempt.id,
        ipAddress: signupAttempt.ipAddress,
        userAgent: signupAttempt.userAgent,
        createdAt: signupAttempt.createdAt,
      })
      .from(signupAttempt)
      .where(eq(signupAttempt.email, u.email))
      .orderBy(desc(signupAttempt.createdAt))
      .limit(1),
    // Total audit events as actor or target — for "events" badge
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(
        sql`(${auditLog.actorId} = ${id} OR ${auditLog.targetId} = ${id})`
      ),
  ])

  return {
    ...u,
    lastSignInAt: lastSession[0]?.createdAt ?? null,
    lastSignInIp: lastSession[0]?.ipAddress ?? null,
    lastSignInUserAgent: lastSession[0]?.userAgent ?? null,
    activeSessionCount: Number(activeSessionCountRow[0]?.count ?? 0),
    totalSessionCount: Number(totalSessionCountRow[0]?.count ?? 0),
    distinctSignInIps: (distinctIps as any[]).map((r) => ({
      ip: r.ip_address as string,
      firstSeen: r.first_seen as Date,
      lastSeen: r.last_seen as Date,
      signInCount: Number(r.sign_in_count),
    })),
    linkedAccounts: linkedAccounts.map((a) => ({
      id: a.id,
      providerId: a.providerId,
      accountId: a.accountId,
      createdAt: a.createdAt,
      lastSignInAt: a.lastSignInAt,
    })),
    signupFromIp: signupRow[0]?.ipAddress ?? null,
    signupFromUa: signupRow[0]?.userAgent ?? null,
    signupAt: signupRow[0]?.createdAt ?? null,
    auditEventCount: Number(auditCountRow[0]?.count ?? 0),
  }
}

/**
 * Single org with member count + status, for the dedicated
 * /admin/workspaces/[id] page. Returns null if the org doesn't exist.
 */
export async function getEnrichedOrgById(id: string) {
  console.log(`[DAL] getEnrichedOrgById ${id}`)
  const [o] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      createdAt: organization.createdAt,
      metadata: organization.metadata,
      suspended: organization.suspended,
      suspendedAt: organization.suspendedAt,
      suspendedReason: organization.suspendedReason,
      suspendedBy: organization.suspendedBy,
    })
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1)
  if (!o) return null

  const [counts] = await db
    .select({
      memberCount: sql<number>`count(*)::int`,
      ownerCount: sql<number>`count(*) FILTER (WHERE ${member.role} = 'owner')::int`,
    })
    .from(member)
    .where(eq(member.organizationId, id))

  return {
    ...o,
    memberCount: Number(counts?.memberCount ?? 0),
    ownerCount: Number(counts?.ownerCount ?? 0),
  }
}

/**
 * Paginated, searchable list of all orgs across all tenants.
 * Replaces getAllOrgsForAdmin — same shape plus search/status/limit/offset.
 */
export async function listAllOrgsForAdmin(opts: {
  search?: string
  statusFilter?: "all" | "active" | "suspended"
  limit?: number
  offset?: number
} = {}) {
  const limit = Math.min(opts.limit ?? 50, 200)
  const offset = opts.offset ?? 0
  const search = opts.search?.trim().toLowerCase()
  const status = opts.statusFilter ?? "all"

  const conditions: any[] = []
  if (search) {
    conditions.push(
      sql`(LOWER(${organization.name}) LIKE ${`%${search}%`} OR LOWER(${organization.slug}) LIKE ${`%${search}%`})`
    )
  }
  if (status === "suspended") {
    conditions.push(eq(organization.suspended, true))
  }
  if (status === "active") {
    conditions.push(eq(organization.suspended, false))
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        createdAt: organization.createdAt,
        suspended: organization.suspended,
        suspendedAt: organization.suspendedAt,
        suspendedReason: organization.suspendedReason,
        memberCount: sql<number>`(
          SELECT count(*)::int FROM ${member} WHERE ${member.organizationId} = ${organization.id}
        )`,
        ownerCount: sql<number>`(
          SELECT count(*)::int FROM ${member} WHERE ${member.organizationId} = ${organization.id} AND ${member.role} = 'owner'
        )`,
      })
      .from(organization)
      .where(where)
      .orderBy(desc(organization.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(organization)
      .where(where),
  ])
  return { orgs: rows, total: Number(totalRow[0]?.count ?? 0) }
}

/**
 * Paginated members of a workspace for the dedicated
 * /admin/workspaces/[id] page. Joins user for email/name/role
 * metadata and a left-join to the user's most recent session for
 * "last active" display.
 */
export async function listWorkspaceMembersForAdmin(
  orgId: string,
  opts: { search?: string; limit?: number; offset?: number } = {}
) {
  const limit = Math.min(opts.limit ?? 50, 200)
  const offset = opts.offset ?? 0
  const search = opts.search?.trim().toLowerCase()

  const conditions: any[] = [eq(member.organizationId, orgId)]
  if (search) {
    conditions.push(
      sql`(LOWER(${user.email}) LIKE ${`%${search}%`} OR LOWER(${user.name}) LIKE ${`%${search}%`})`
    )
  }
  const where = and(...conditions)

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        memberId: member.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: member.role,
        platformRole: user.role,
        banned: user.banned,
        suspended: sql<boolean>`(${user.suspendedAt} IS NOT NULL AND (${user.suspendedUntil} IS NULL OR ${user.suspendedUntil} > NOW()))`,
        lastActiveAt: sql<Date | null>`(
          SELECT MAX(${sessionTable.createdAt}) FROM ${sessionTable}
          WHERE ${sessionTable.userId} = ${user.id}
        )`,
        joinedAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(where)
      .orderBy(desc(member.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(where),
  ])
  return { members: rows, total: Number(totalRow[0]?.count ?? 0) }
}

/**
 * TMS stats for one workspace — powers the 6-tile stat grid on the
 * dedicated workspace detail page.
 *
 * NOTE on date binding: postgres-js (the driver underneath Drizzle
 * here) does not accept raw `Date` objects as parameters. The
 * official postgres-js guidance is to serialize dates as ISO strings
 * before interpolation. We do that here, and use a plain SQL interval
 * for the "last 30 days" comparison so we don't need a JS Date at all
 * in the query.
 */
export async function getOrgStats(orgId: string) {
  console.log(`[DAL] getOrgStats ${orgId}`)

  const [
    activeLoadsRow,
    totalLoadsRow,
    activeDriversRow,
    totalDriversRow,
    activeTrucksRow,
    totalTrucksRow,
    paidInvoicesRow,
    outstandingInvoicesRow,
    revenue30dRow,
    revenueAllRow,
    lastAuditRow,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(load)
      .where(
        and(
          eq(load.tenantId, orgId),
          sql`${load.status} IN ('booked', 'dispatched', 'in_transit')`
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(load)
      .where(eq(load.tenantId, orgId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(driver)
      .where(and(eq(driver.tenantId, orgId), eq(driver.status, "active"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(driver)
      .where(eq(driver.tenantId, orgId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(truck)
      .where(
        and(
          eq(truck.tenantId, orgId),
          sql`${truck.status} IN ('available', 'in_use')`
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(truck)
      .where(eq(truck.tenantId, orgId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoice)
      .where(and(eq(invoice.tenantId, orgId), eq(invoice.status, "paid"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoice)
      .where(
        and(
          eq(invoice.tenantId, orgId),
          sql`${invoice.status} IN ('pending', 'overdue')`
        )
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${invoice.amount}::numeric), 0)`,
      })
      .from(invoice)
      .where(
        and(
          eq(invoice.tenantId, orgId),
          eq(invoice.status, "paid"),
          // Use a SQL interval rather than passing a JS Date —
          // postgres-js rejects raw Date parameters.
          sql`${invoice.paidDate} >= NOW() - INTERVAL '30 days'`
        )
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${invoice.amount}::numeric), 0)`,
      })
      .from(invoice)
      .where(and(eq(invoice.tenantId, orgId), eq(invoice.status, "paid"))),
    // Last activity = most recent audit event scoped to this org.
    // We look at two ways events reference an org: targetType='org'
    // and targetId=orgId, or metadata.organizationId=orgId.
    db.execute(sql`
      SELECT created_at FROM ${auditLog}
      WHERE (${auditLog.targetType} = 'org' AND ${auditLog.targetId} = ${orgId})
         OR (${auditLog.metadata}->>'organizationId' = ${orgId})
      ORDER BY created_at DESC LIMIT 1
    ` as any),
  ])

  return {
    loads: {
      active: Number(activeLoadsRow[0]?.count ?? 0),
      total: Number(totalLoadsRow[0]?.count ?? 0),
    },
    drivers: {
      active: Number(activeDriversRow[0]?.count ?? 0),
      total: Number(totalDriversRow[0]?.count ?? 0),
    },
    trucks: {
      active: Number(activeTrucksRow[0]?.count ?? 0),
      total: Number(totalTrucksRow[0]?.count ?? 0),
    },
    invoices: {
      paid: Number(paidInvoicesRow[0]?.count ?? 0),
      outstanding: Number(outstandingInvoicesRow[0]?.count ?? 0),
    },
    revenue: {
      last30d: Number(revenue30dRow[0]?.total ?? 0),
      allTime: Number(revenueAllRow[0]?.total ?? 0),
    },
    lastActivityAt: (lastAuditRow?.[0] as any)?.created_at ?? null,
  }
}

/** Activity events for one user — powers the /admin/users/[id]
 *  Activity tab. Server-side version of the /activity API route. */
export async function getUserActivityForAdmin(
  userId: string,
  opts: { limit?: number } = {}
) {
  const limit = Math.min(opts.limit ?? 50, 200)
  console.log(`[DAL] getUserActivityForAdmin ${userId} limit=${limit}`)
  return listAuditEvents({ targetId: userId, limit, offset: 0 })
}

/** Activity events for one org — powers the /admin/workspaces/[id]
 *  Activity tab. */
export async function getOrgActivityForAdmin(
  orgId: string,
  opts: { limit?: number } = {}
) {
  const limit = Math.min(opts.limit ?? 30, 200)
  console.log(`[DAL] getOrgActivityForAdmin ${orgId} limit=${limit}`)
  const where = sql`(
    (${auditLog.targetType} = 'org' AND ${auditLog.targetId} = ${orgId})
    OR (${auditLog.metadata}->>'organizationId' = ${orgId})
  )`
  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where),
  ])
  return { events: rows, total: Number(totalRow[0]?.count ?? 0) }
}

/** Admin-only enriched user list. Returns Better Auth admin fields
 *  (role, banned, banReason, banExpires) AND our custom suspend fields
 *  (suspendedAt, suspendedUntil, suspendedReason, appealStatus, etc).
 *  Search filters by email/name (case-insensitive contains). */
export async function listEnrichedUsersForAdmin(opts: {
  search?: string
  statusFilter?: "all" | "active" | "banned" | "suspended"
  limit?: number
  offset?: number
} = {}) {
  const limit = Math.min(opts.limit ?? 50, 200)
  const offset = opts.offset ?? 0
  const search = opts.search?.trim().toLowerCase()
  const status = opts.statusFilter ?? "all"

  // Base WHERE assembled by hand
  const conditions: any[] = []
  if (search) {
    conditions.push(sql`(LOWER(${user.email}) LIKE ${`%${search}%`} OR LOWER(${user.name}) LIKE ${`%${search}%`})`)
  }
  if (status === "banned") {
    conditions.push(eq(user.banned, true))
  }
  if (status === "suspended") {
    conditions.push(
      and(
        sql`${user.suspendedAt} IS NOT NULL`,
        sql`(${user.suspendedUntil} IS NULL OR ${user.suspendedUntil} > NOW())`
      )
    )
  }
  if (status === "active") {
    conditions.push(eq(user.banned, false))
    // Active = not banned AND not currently suspended
    conditions.push(
      sql`(${user.suspendedAt} IS NULL OR ${user.suspendedUntil} <= NOW())`
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        suspendedAt: user.suspendedAt,
        suspendedUntil: user.suspendedUntil,
        suspendedReason: user.suspendedReason,
        suspendedBy: user.suspendedBy,
        appealStatus: user.appealStatus,
        appealSubmittedAt: user.appealSubmittedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(where),
  ])
  return { users: rows, total: Number(totalRow[0]?.count ?? 0) }
}

/** Returns users with an open appeal — for the appeals inbox. */
export async function listOpenAppealsForAdmin() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
      suspendedReason: user.suspendedReason,
      appealMessage: user.appealMessage,
      appealSubmittedAt: user.appealSubmittedAt,
      appealStatus: user.appealStatus,
    })
    .from(user)
    .where(eq(user.appealStatus, "open"))
    .orderBy(desc(user.appealSubmittedAt))
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Workspace team page helpers (WS-16…WS-30)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * listWorkspaceMembers — used by /settings/team.
 *
 * Returns the active workspace's members with:
 *   - profile + role (workspace + platform)
 *   - banned / platform-suspended status
 *   - workspace-scoped suspension (WS-26)
 *   - last-active timestamp
 *
 * Powers: WS-22 search, WS-23 status badges, WS-26 suspend UI.
 */
export async function listWorkspaceMembers(
  orgId: string,
  opts: {
    search?: string
    status?: "all" | "active" | "suspended"
    limit?: number
    offset?: number
  } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200)
  const offset = opts.offset ?? 0
  const search = opts.search?.trim().toLowerCase()
  const status = opts.status ?? "all"

  const conditions: any[] = [eq(member.organizationId, orgId)]
  if (search) {
    conditions.push(
      sql`(LOWER(${user.email}) LIKE ${`%${search}%`} OR LOWER(${user.name}) LIKE ${`%${search}%`})`,
    )
  }
  if (status === "active") {
    conditions.push(
      sql`(${member.suspendedAt} IS NULL OR ${member.suspendedUntil} <= NOW())`,
    )
  }
  if (status === "suspended") {
    conditions.push(
      sql`(${member.suspendedAt} IS NOT NULL AND (${member.suspendedUntil} IS NULL OR ${member.suspendedUntil} > NOW()))`,
    )
  }
  const where = and(...conditions)

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        memberId: member.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: member.role,
        platformRole: user.role,
        banned: user.banned,
        userSuspendedAt: user.suspendedAt,
        userSuspendedUntil: user.suspendedUntil,
        memberSuspendedAt: member.suspendedAt,
        memberSuspendedUntil: member.suspendedUntil,
        memberSuspendedReason: member.suspendedReason,
        memberSuspendedBy: member.suspendedBy,
        joinedAt: member.createdAt,
        lastActiveAt: sql<Date | null>`(
          SELECT MAX(${sessionTable.createdAt}) FROM ${sessionTable}
          WHERE ${sessionTable.userId} = ${user.id}
        )`,
      })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(where)
      .orderBy(desc(member.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(where),
  ])
  return { members: rows, total: Number(totalRow[0]?.count ?? 0) }
}

/**
 * listInvitationsForOrg — workspace-side invitation list with status filter
 * (WS-19). Distinct from Better Auth's `listInvitations` which doesn't
 * surface accepted/canceled/rejected cleanly to the UI.
 */
export async function listInvitationsForOrg(
  orgId: string,
  opts: {
    status?: "pending" | "accepted" | "rejected" | "canceled" | "all"
  } = {},
) {
  const status = opts.status ?? "all"
  const conditions: any[] = [eq(invitation.organizationId, orgId)]
  if (status !== "all") conditions.push(eq(invitation.status, status))
  const where = and(...conditions)
  return db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      inviterEmail: invitation.inviterEmail,
    })
    .from(invitation)
    .where(where)
    .orderBy(desc(invitation.createdAt))
}

/**
 * listOrgRecentAudit — WS-30 "Recent access changes" card.
 *
 * Returns audit rows whose action is one of the access-management
 * actions AND whose scope is this org (either targetType='org'
 * with targetId=orgId, or metadata.organizationId=orgId).
 */
export async function listOrgRecentAudit(
  orgId: string,
  opts: { limit?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 20, 100)
  const actions = [
    "user.invite-to-org",
    "user.invite-resent",
    "user.invite-cancelled",
    "user.set-member-role",
    "user.remove-from-org",
    "user.suspend-from-workspace",
    "user.lift-workspace-suspension",
    "org.transfer-ownership",
  ] as const
  const where = and(
    inArray(auditLog.action, actions as unknown as string[]),
    sql`(${auditLog.targetType} = 'org' AND ${auditLog.targetId} = ${orgId}
       OR ${auditLog.metadata}->>'organizationId' = ${orgId})`,
  )
  const rows = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
  return { events: rows }
}
