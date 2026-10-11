/**
 * /admin/users/[id] — dedicated full page for one user.
 *
 * Replaces the previous right-side Sheet drawer with a real page that
 * is deep-linkable, has a proper URL, and doesn't fight for screen
 * real estate with the table.
 */
import { notFound } from "next/navigation"
import { getEnrichedUserById, resolveUserRoles, requireAdmin } from "@/lib/dal"
import { UserDetailPage } from "./user-detail-page"

// Detail pages run data fetches at render time, so they must not be
// prerendered (the (admin) layout already calls `getSession` which
// is also non-prerenderable).
export const instant = false

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  console.log(`[ADMIN-USER-DETAIL-PAGE] rendering`)
  const { id } = await params
  // Defensive: the (admin) layout already calls requireAdmin, but
  // we re-check so this page can't be served from a cached frame to
  // a non-admin (in case of cacheComponents surprises).
  await requireAdmin()
  const [user, roles] = await Promise.all([
    getEnrichedUserById(id),
    resolveUserRoles(id),
  ])
  if (!user || !roles) {
    console.log(`[ADMIN-USER-DETAIL-PAGE] 404 user ${id} not found`)
    notFound()
  }

  return (
    <UserDetailPage
      user={{
        ...user,
        banned: user.banned ?? false,
        banReason: user.banReason ?? null,
        banExpires: user.banExpires
          ? new Date(user.banExpires).toISOString()
          : null,
        suspendedAt: user.suspendedAt
          ? new Date(user.suspendedAt).toISOString()
          : null,
        suspendedUntil: user.suspendedUntil
          ? new Date(user.suspendedUntil).toISOString()
          : null,
        suspendedReason: user.suspendedReason ?? null,
        appealMessage: user.appealMessage ?? null,
        appealStatus: user.appealStatus ?? null,
        appealSubmittedAt: user.appealSubmittedAt
          ? new Date(user.appealSubmittedAt).toISOString()
          : null,
        phone: user.phone ?? null,
        username: user.username ?? null,
        displayUsername: user.displayUsername ?? null,
        createdAt: new Date(user.createdAt).toISOString(),
        updatedAt: new Date(user.updatedAt).toISOString(),
        lastSignInAt: user.lastSignInAt
          ? new Date(user.lastSignInAt).toISOString()
          : null,
        lastSignInIp: user.lastSignInIp ?? null,
        lastSignInUserAgent: user.lastSignInUserAgent ?? null,
        activeSessionCount: user.activeSessionCount,
        totalSessionCount: user.totalSessionCount,
        distinctSignInIps: user.distinctSignInIps.map((r) => ({
          ip: r.ip,
          firstSeen: new Date(r.firstSeen).toISOString(),
          lastSeen: new Date(r.lastSeen).toISOString(),
          signInCount: r.signInCount,
        })),
        linkedAccounts: user.linkedAccounts.map((a) => ({
          id: a.id,
          providerId: a.providerId,
          accountId: a.accountId,
          createdAt: new Date(a.createdAt).toISOString(),
          lastSignInAt: new Date(a.lastSignInAt).toISOString(),
        })),
        signupFromIp: user.signupFromIp ?? null,
        signupFromUa: user.signupFromUa ?? null,
        signupAt: user.signupAt
          ? new Date(user.signupAt).toISOString()
          : null,
        auditEventCount: user.auditEventCount,
        image: user.image ?? null,
      }}
      memberships={roles.workspaceMemberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        organizationSlug: m.organizationSlug,
        role: m.role,
        createdAt: new Date(m.createdAt).toISOString(),
      }))}
    />
  )
}
