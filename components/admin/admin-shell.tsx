"use client"

/**
 * AdminShell — the chrome wrapper for every /admin/* page.
 *
 * Pattern: shadcn dashboard-01.
 *   <SidebarProvider>
 *     <AppSidebar />
 *     <SidebarInset>
 *       <SiteHeader />
 *       <main className="@container/main ...">{children}</main>
 *     </SidebarInset>
 *   </SidebarProvider>
 *
 * - SidebarProvider persists the collapsed/expanded state in a cookie
 *   (see SIDEBAR_COOKIE_NAME in components/ui/sidebar.tsx).
 * - The <main> uses the @container/* container query utilities from
 *   shadcn so child grids can adapt to the available width.
 * - ImpersonationBanner (when active) renders above the entire shell
 *   so it spans the sidebar too.
 */
import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { AppSidebar } from "@/components/admin/sidebar/app-sidebar"
import { SiteHeader } from "@/components/admin/site-header"
import { SearchCommand } from "@/components/admin/search-command"

export function AdminShell({
  userName,
  userEmail,
  userImage,
  impersonatedBy,
  unreadAppeals = 0,
  children,
}: {
  userName: string
  userEmail: string
  userImage: string | null
  impersonatedBy: string | null
  unreadAppeals?: number
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3.5rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      {impersonatedBy && <ImpersonationBanner impersonatedByEmail={impersonatedBy} />}
      <AppSidebar
        user={{ name: userName, email: userEmail, image: userImage }}
        impersonatedBy={impersonatedBy}
        unreadAppeals={unreadAppeals}
      />
      <SidebarInset className="bg-brand-cream">
        <SiteHeader />
        <main className="@container/main flex flex-1 flex-col gap-2 bg-brand-cream">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
      <SearchCommand />
    </SidebarProvider>
  )
}
