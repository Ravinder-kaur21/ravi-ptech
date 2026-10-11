import { redirect } from "next/navigation"
import { getSession, requireAdmin } from "@/lib/dal"
import { AdminShell } from "@/components/admin/admin-shell"

export const metadata = {
  title: "Admin · Muvx",
}

/**
 * Admin console layout. Gates by:
 *   1. signed-in (else → /login)
 *   2. user.role === 'admin' in the DB (else → /dashboard)
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

  let admin
  try {
    admin = await requireAdmin()
    console.log("[ADMIN-LAYOUT] ✅ admin verified:", admin.userEmail)
  } catch (err) {
    console.warn("[ADMIN-LAYOUT] not an admin → /dashboard")
    redirect("/dashboard")
  }

  // Pass impersonation state so the banner can render.
  const impersonatedBy =
    (session.session as any).impersonatedBy ?? null

  return (
    <AdminShell
      userName={admin.userName}
      userEmail={admin.userEmail}
      userImage={admin.userImage}
      impersonatedBy={impersonatedBy}
    >
      {children}
    </AdminShell>
  )
}