import "server-only"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { eq, and, desc, sql, ne, gte, isNull } from "drizzle-orm"
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
} from "@/lib/schema"
import { cache } from "react"

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
 * Ensures we have a valid user and active organization.
 * Use this in any Server Action or Route Handler that touches tenant data.
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
  return {
    userId: session.user.id,
    userRole: (session.user as any).role ?? null,
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
