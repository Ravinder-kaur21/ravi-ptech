import { redirect } from "next/navigation"
import { getSession, requireAdmin, getAdminStats } from "@/lib/dal"
import { isIpAllowlisted } from "@/lib/request-gate"
import { AdminShell } from "@/components/admin/admin-shell"
import { IpBlockedScreen } from "@/components/ip-blocked-screen"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin · Muvx",
}

/**
 * Admin console layout. Gates by:
 *   1. signed-in (else → /login)
 *   2. user.role === 'admin' in the DB (else → /dashboard)
 *   3. request IP is in the IP allowlist (if the list is non-empty)
 *
 * The (admin) route group is OUTSIDE the (dashboard) group so admin access
 * does NOT require an active organization. Admins can manage the system
 * even if they have no workspace of their own.
 *
 * To bootstrap your own admin status, run in psql:
 *   UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) {
    console.log("[ADMIN-LAYOUT] no session → /login")
    redirect("/login")
  }

  // IP allowlist gate (runs before requireAdmin so non-admins also see
  // the blocked page rather than /login).
  const ipCheck = await isIpAllowlisted()
  if (!ipCheck.allowlisted) {
    console.warn(
      `[ADMIN-LAYOUT] IP ${ipCheck.ip ?? "?"} blocked (${ipCheck.totalEntries} allowlist entries)`
    )
    return (
      <IpBlockedScreen ip={ipCheck.ip} totalEntries={ipCheck.totalEntries} />
    )
  }

  let admin
  try {
    admin = await requireAdmin()
    console.log("[ADMIN-LAYOUT] ✅ admin verified:", admin.userEmail)
  } catch (err) {
    console.warn("[ADMIN-LAYOUT] not an admin → /dashboard")
    redirect("/dashboard")
  }

  // Pull stats so the sidebar appeals badge is fresh on every nav.
  // (We only need the count, but stats is one cheap round-trip.)
  const stats = await getAdminStats().catch((err) => {
    console.warn("[ADMIN-LAYOUT] stats fetch failed (non-fatal):", err)
    return { openAppeals: 0, totalUsers: 0, bannedUsers: 0, suspendedUsers: 0, totalOrgs: 0, totalMembers: 0, pendingInvitations: 0 }
  })

  // Pass impersonation state so the banner can render.
  const impersonatedBy =
    (session.session as any).impersonatedBy ?? null

  console.log(
    `[ADMIN-LAYOUT] rendering for ${admin.userEmail} (impersonatedBy=${impersonatedBy ?? "none"}, appeals=${stats.openAppeals})`
  )

  return (
    <AdminShell
      userName={admin.userName}
      userEmail={admin.userEmail}
      userImage={admin.userImage}
      impersonatedBy={impersonatedBy}
      unreadAppeals={stats.openAppeals}
    >
      {children}
    </AdminShell>
  )
}
