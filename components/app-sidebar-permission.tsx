"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import {
  ChevronsUpDown,
  Building2,
  Plus,
  type LucideIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePermissions } from "@/lib/permissions-context"
import { SIDEBAR_NAV, filterNavByPermissions } from "@/lib/nav-config"
import { PinnedRecent } from "@/components/pinned-recent"
import { NavUser } from "@/components/nav-user"
import { cn } from "@/lib/utils"

// ─── Nav config ──────────────────────────────────────────────────

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type SidebarSession = {
  userId: string
  userName: string
  userEmail: string
  userImage: string | null
  userRole: string
}

type SidebarOrg = {
  id: string
  name: string
  slug: string
  logo: string | null
  metadata: Record<string, any> | null
}

/**
 * Permission-driven sidebar.
 *
 * Every item in SIDEBAR_NAV declares a `requiresKey` permission. We
 * read the user's effective permission set and filter. No role names
 * appear here — only keys. The order of groups is the order in
 * lib/nav-config.ts: Main, Operations, Money, Compliance, Team,
 * Settings. Empty groups are not rendered.
 */
export function AppSidebarPermission({
  org,
  session,
  isImpersonating = false,
}: {
  org: SidebarOrg
  session: SidebarSession
  isImpersonating?: boolean
}) {
  const pathname = usePathname()
  const perms = usePermissions()

  const { data: orgsData } = useQuery({
    queryKey: ["orgs-list"],
    queryFn: async () => {
      const r = await authClient.organization.list()
      return r.data ?? []
    },
  })
  const orgs = (orgsData ?? []) as { id: string; name: string; slug: string }[]

  const handleSwitchOrg = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId })
    window.location.reload()
  }

  // Filter every group; drop groups that have zero visible items.
  const visibleGroups = React.useMemo(() => {
    return SIDEBAR_NAV.map((g) => ({
      ...g,
      items: filterNavByPermissions(g.items, perms),
    })).filter((g) => g.items.length > 0)
  }, [perms])

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Brand header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              size="lg"
              tooltip="Muvx TMS"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-brand-ink text-brand-cream shrink-0">
                <span className="font-serif text-base font-medium">M</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-serif text-[18px] font-semibold tracking-tight text-brand-ink">
                  Muvx<span className="text-brand-accent">TMS</span>
                </span>
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Transportation management
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Org switcher */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    tooltip={org.name}
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-sidebar-border"
                  />
                }
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent flex-shrink-0">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold text-brand-ink">
                    {org.name}
                  </span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    /{org.slug}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-brand-muted-soft" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-[220px] rounded-lg border-sidebar-border bg-brand-card p-1"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft px-2 py-1.5">
                    Workspaces
                  </DropdownMenuLabel>
                  {orgs.map((o) => (
                    <DropdownMenuItem
                      key={o.id}
                      onClick={() => handleSwitchOrg(o.id)}
                      className="rounded-md cursor-pointer"
                    >
                      <Building2 className="mr-2 size-4 text-brand-muted-soft" />
                      <span className="truncate flex-1">{o.name}</span>
                      {o.id === org.id && (
                        <span className="ml-auto text-brand-accent">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-sidebar-border" />
                <DropdownMenuItem
                  render={
                    <Link
                      href="/onboarding?create=1"
                      className="rounded-md cursor-pointer text-brand-accent"
                    />
                  }
                >
                  <Plus className="mr-2 size-4" />
                  New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-sidebar-border" />

      <SidebarContent>
        {visibleGroups.map((group) => (
          <React.Fragment key={group.id}>
            <SidebarGroup>
              <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            isActive
                              ? "bg-brand-ink text-brand-cream hover:bg-brand-ink hover:text-brand-cream"
                              : "text-brand-ink/80 hover:bg-brand-accent-tint hover:text-brand-ink"
                          )}
                        >
                          <item.icon className="size-[18px]" />
                          <span className="text-[15px] font-medium">
                            {item.label}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator className="bg-sidebar-border" />
          </React.Fragment>
        ))}

        {/* Pinned + recent — kept as-is for continuity */}
        <PinnedRecent orgId={org.id} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={session} isImpersonating={isImpersonating} />
      </SidebarFooter>

      <SidebarRail className="border-sidebar-border" />
    </Sidebar>
  )
}
