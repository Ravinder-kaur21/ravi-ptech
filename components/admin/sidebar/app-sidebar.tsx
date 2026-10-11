"use client"

/**
 * AppSidebar — the admin console's primary chrome. Adapted from
 * shadcn sidebar-07: collapsible to icon mode, sticky rail, uses
 * the brand Sidebar primitive already in @/components/ui/sidebar.tsx.
 *
 * Brand: Muvx cream + ink + burnt orange (no shadcn slate). Theme
 * tokens (--sidebar, --sidebar-foreground, --sidebar-primary, …)
 * are wired to Muvx OKLCH values in app/globals.css.
 *
 * No "Back to app" link — the admin route group is structurally
 * independent of /dashboard (see CLAUDE.md).
 */
import * as React from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Building2,
  Inbox,
  ScrollText,
  Shield,
  Flag,
  Megaphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain, type NavMainItem } from "./nav-main"
import { NavUser } from "./nav-user"

export type AdminNavItem = NavMainItem & {
  description?: string
}

const ADMIN_NAV: AdminNavItem[] = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Workspaces",
    href: "/admin/workspaces",
    icon: Building2,
  },
  {
    title: "Appeals",
    href: "/admin/appeals",
    icon: Inbox,
  },
  {
    title: "Security",
    href: "/admin/security",
    icon: Shield,
  },
  {
    title: "Feature flags",
    href: "/admin/flags",
    icon: Flag,
  },
  {
    title: "Communications",
    href: "/admin/comms",
    icon: Megaphone,
  },
  {
    title: "Audit log",
    href: "/admin/audit",
    icon: ScrollText,
  },
]

export function AppSidebar({
  user,
  impersonatedBy,
  unreadAppeals,
  ...props
}: {
  user: { name: string; email: string; image: string | null }
  impersonatedBy: string | null
  unreadAppeals?: number
} & React.ComponentProps<typeof Sidebar>) {
  // Attach the appeals badge to its nav entry when present
  const items: NavMainItem[] = ADMIN_NAV.map((n) =>
    n.href === "/admin/appeals" && unreadAppeals
      ? { ...n, badge: unreadAppeals }
      : n
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link
          href="/admin"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-ink text-brand-cream">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-serif text-[15px] font-semibold tracking-tight text-brand-ink">
              Muvx<span className="text-brand-accent"> Admin</span>
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Superadmin console
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} impersonatedBy={impersonatedBy} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
