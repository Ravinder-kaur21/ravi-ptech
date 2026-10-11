import { redirect } from "next/navigation"
import { and, eq, isNull, lte, gte, or, sql } from "drizzle-orm"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  getSession,
  getOrganizationById,
  getMembersForOrg,
  getIsAdmin,
} from "@/lib/dal"
import { db } from "@/lib/db"
import { announcement, member, user as userTable } from "@/lib/schema"
import { isMaintenanceMode } from "@/lib/request-gate"

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

  // [LAYOUT] Gate: maintenance mode. Admins always see the app.
  const isAdminForGate = await getIsAdmin()
  if (!isAdminForGate) {
    const maintenance = await isMaintenanceMode()
    if (maintenance) {
      console.log("[DASHBOARD-LAYOUT] maintenance on, non-admin → /maintenance")
      redirect("/maintenance")
    }
  }

  // [LAYOUT] Gate: must have an active organization
  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    console.log("[DASHBOARD-LAYOUT] no active org → /onboarding")
    redirect("/onboarding")
  }

  // [LAYOUT] Fetch the active org, the user's membership, admin status,
  // and the list of currently-active announcements — all in parallel.
  const [org, members, isAdmin, activeAnnouncements] = await Promise.all([
    getOrganizationById(orgId),
    getMembersForOrg(orgId),
    getIsAdmin(),
    fetchActiveAnnouncements({
      userId: session.user.id,
      orgId,
      isAdmin: false, // updated below
    }),
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

  // [LAYOUT] Gate: workspace-scoped suspension (WS-26).
  // Phase 1 added `member.suspendedAt` + `member.suspendedUntil`. If
  // the active-org membership is currently suspended, bounce the
  // user to a workspace-specific suspended screen. Platform admins
  // bypass this gate so they can still inspect suspended workspaces.
  if (
    !isAdminForGate &&
    myMembership?.suspendedAt &&
    (!myMembership.suspendedUntil ||
      new Date(myMembership.suspendedUntil as any) > new Date())
  ) {
    console.log(
      `[DASHBOARD-LAYOUT] workspace suspended user=${session.user.id} org=${orgId} → /workspace-suspended`,
    )
    redirect("/workspace-suspended")
  }

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
        <AnnouncementBanner initial={activeAnnouncements} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

/**
 * Server-side fetch of currently-active announcements for a user.
 * Mirrors the API route used by the polling client component so the
 * first paint is banner-aware.
 */
async function fetchActiveAnnouncements({
  userId,
  orgId,
  isAdmin,
}: {
  userId: string
  orgId: string
  isAdmin: boolean
}) {
  const now = new Date()
  const visibilityOr = [eq(announcement.scope, "global")]
  if (isAdmin) visibilityOr.push(eq(announcement.scope, "admins_only"))
  // All orgs the user belongs to (just the active one in this layout,
  // but the API endpoint checks all memberships).
  visibilityOr.push(
    and(eq(announcement.scope, "org"), eq(announcement.organizationId, orgId))!
  )

  const rows = await db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      kind: announcement.kind,
      dismissible: announcement.dismissible,
    })
    .from(announcement)
    .where(
      and(
        or(...visibilityOr)!,
        or(isNull(announcement.startsAt), lte(announcement.startsAt, now))!,
        or(isNull(announcement.endsAt), gte(announcement.endsAt, now))!
      )
    )
    .orderBy(announcement.createdAt)

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    kind: r.kind as "info" | "warn" | "success" | "maintenance",
    dismissible: r.dismissible,
    link: null as string | null,
    linkLabel: null as string | null,
  }))
}
