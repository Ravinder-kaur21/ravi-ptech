import "server-only"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { member, organization, invitation } from "@/lib/schema"
import { auth } from "@/lib/auth"
import { getSession } from "@/lib/dal"

/**
 * Centralized post-auth destination resolver.
 *
 * Called from:
 *   - app/auth-redirect/page.tsx (Google OAuth callback, verify links)
 *   - components/login-form.tsx (email + OTP sign-in)
 *   - app/onboarding/page.tsx (after workspace created)
 *
 * Decision tree:
 *   1. Platform admin (user.role === 'admin')  → /admin
 *      Admins who also belong to a workspace can use the
 *      "View as workspace" link in the admin nav-user dropdown
 *      to switch into a workspace context.
 *   2. No platform admin, no orgs               → /onboarding
 *   3. No platform admin, exactly 1 org         → setActive(org) → /dashboard
 *   4. No platform admin, many orgs             → /select-org
 *
 * Honors `?next=` in the URL if present and same-origin — used by
 * invitation links and deep links from email broadcasts.
 */

export type Destination =
  | "/admin"
  | "/dashboard"
  | "/onboarding"
  | "/select-org"

/** A new invite recipient has no member row until the invite is accepted. */
async function getPendingInviteDestination(email: string): Promise<Destination | string | null> {
  const rows = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.email, email.toLowerCase()), eq(invitation.status, "pending")))
    .limit(1)
  return rows[0]?.id ? `/invite/${rows[0].id}` : null
}

const KNOWN_DESTS: ReadonlyArray<Destination> = [
  "/admin",
  "/dashboard",
  "/onboarding",
  "/select-org",
]

function isKnownDest(s: string): s is Destination {
  return (KNOWN_DESTS as readonly string[]).includes(s)
}

export async function postAuthDestination(
  opts: { next?: string | null; activeOrgId?: string | null } = {}
): Promise<Destination | string> {
  console.log("[ROLE-PATHS] resolving post-auth destination", {
    next: opts.next,
    activeOrgId: opts.activeOrgId,
  })

  // Honor explicit ?next= if it's one of our known destinations
  if (opts.next && isKnownDest(opts.next)) {
    console.log(`[ROLE-PATHS] honoring ?next= → ${opts.next}`)
    return opts.next
  }

  const session = await getSession()
  if (!session?.user) {
    console.warn("[ROLE-PATHS] no session → /login (caller must handle)")
    return "/onboarding"
  }

  // 1. Platform admin short-circuit
  if ((session.user as any).role === "admin") {
    console.log(`[ROLE-PATHS] platform admin ${session.user.email} → /admin`)
    return "/admin"
  }

  const pendingInvite = await getPendingInviteDestination(session.user.email)
  if (pendingInvite) {
    console.log(`[ROLE-PATHS] pending invite for ${session.user.email} → ${pendingInvite}`)
    return pendingInvite
  }

  // 2/3/4. Look at the user's orgs
  const memberships = await db
    .select({ organizationId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, session.user.id))

  if (memberships.length === 0) {
    console.log(`[ROLE-PATHS] no orgs → /onboarding`)
    return "/onboarding"
  }

  if (memberships.length === 1) {
    const orgId = memberships[0]!.organizationId
    try {
      const h = await headers()
      await auth.api.setActiveOrganization({
        body: { organizationId: orgId },
        headers: h,
      })
      console.log(
        `[ROLE-PATHS] 1 org ${orgId} → setActive + /dashboard`
      )
    } catch (err) {
      console.warn(
        `[ROLE-PATHS] failed to setActive on single org ${orgId}:`,
        err
      )
    }
    return "/dashboard"
  }

  console.log(
    `[ROLE-PATHS] ${memberships.length} orgs → /select-org`
  )
  return "/select-org"
}

/** Used by the /api/me/routing client-callable endpoint. */
export async function getRoutingPayload(): Promise<{
  destination: Destination | string
  isPlatformAdmin: boolean
  email: string | null
  name: string | null
  orgs: { id: string; name: string; slug: string; role: string }[]
  activeOrgId: string | null
}> {
  const session = await getSession()
  if (!session?.user) {
    return {
      destination: "/onboarding",
      isPlatformAdmin: false,
      email: null,
      name: null,
      orgs: [],
      activeOrgId: null,
    }
  }
  const isAdmin = (session.user as any).role === "admin"

  if (!isAdmin) {
    const pendingInvite = await getPendingInviteDestination(session.user.email)
    if (pendingInvite) {
      return {
        destination: pendingInvite,
        isPlatformAdmin: false,
        email: session.user.email,
        name: session.user.name ?? null,
        orgs: [],
        activeOrgId: (session.session as any)?.activeOrganizationId ?? null,
      }
    }
  }

  const memberships = await db
    .select({
      organizationId: member.organizationId,
      role: member.role,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, session.user.id))

  const destination = isAdmin
    ? "/admin"
    : memberships.length === 0
      ? "/onboarding"
      : memberships.length === 1
        ? "/dashboard"
        : "/select-org"

  return {
    destination,
    isPlatformAdmin: isAdmin,
    email: session.user.email,
    name: session.user.name ?? null,
    orgs: memberships.map((m) => ({
      id: m.organizationId,
      name: m.name,
      slug: m.slug,
      role: m.role,
    })),
    activeOrgId: (session.session as any)?.activeOrganizationId ?? null,
  }
}
