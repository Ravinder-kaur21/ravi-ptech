import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  getSession,
  getOrganizationById,
  getMembersForOrg,
  getIsAdmin,
} from "@/lib/dal"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // [LAYOUT] Gate: must be signed in
  const session = await getSession()
  if (!session?.user) {
    console.log("[DASHBOARD-LAYOUT] no session → /login")
    redirect("/login")
  }

  // [LAYOUT] Gate: must have an active organization
  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    console.log("[DASHBOARD-LAYOUT] no active org → /onboarding")
    redirect("/onboarding")
  }

  // [LAYOUT] Fetch the active org, the user's membership, and admin status in parallel
  const [org, members, isAdmin] = await Promise.all([
    getOrganizationById(orgId),
    getMembersForOrg(orgId),
    getIsAdmin(),
  ])

  // [LAYOUT] If the active org in session doesn't exist (e.g. deleted),
  // bounce to /select-org so the user can pick a valid one
  if (!org) {
    console.warn("[DASHBOARD-LAYOUT] active org not found in DB, redirecting to /select-org")
    redirect("/select-org")
  }

  // [LAYOUT] Find this user's role in the active org
  const myMembership = members.find((m) => m.userId === session.user.id)
  const role = myMembership?.role ?? "member"

  // [LAYOUT] Detect impersonation (Better Auth sets session.session.impersonatedBy)
  const impersonatedBy =
    (session.session as any).impersonatedBy ?? null
  if (impersonatedBy) {
    console.log("[DASHBOARD-LAYOUT] impersonation active by:", impersonatedBy)
  }

  // [LAYOUT] Serialize the session for the client components
  const sidebarSession = {
    userId: session.user.id,
    userName: session.user.name ?? "User",
    userEmail: session.user.email,
    userImage: session.user.image ?? null,
    userRole: role,
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "260px",
          "--sidebar-width-icon": "60px",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        org={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          metadata: (org.metadata as Record<string, any> | null) ?? null,
        }}
        session={sidebarSession}
        isAdmin={isAdmin}
        isImpersonating={!!impersonatedBy}
      />
      <SidebarInset className="bg-background">
        <SiteHeader
          userName={session.user.name ?? "User"}
          userEmail={session.user.email}
          userImage={session.user.image ?? null}
          isImpersonating={!!impersonatedBy}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
