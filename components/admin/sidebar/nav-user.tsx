"use client"

/**
 * Admin nav-user — shadcn sidebar-07, Muvx theme.
 *
 * Provides a "View as workspace" link that switches the platform
 * admin into a workspace context (sets activeOrganizationId on
 * their session). This is the inverse of impersonation: the admin
 * is not pretending to be a user, they are just navigating into
 * their own workspace to do work.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  ChevronsUpDown,
  LogOut,
  UserCog,
  ShieldAlert,
  ExternalLink,
  Building2,
  Loader2,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
  impersonatedBy,
}: {
  user: { name: string; email: string; image: string | null }
  /** Email of the admin who is currently impersonating, if any. */
  impersonatedBy: string | null
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [signingOut, setSigningOut] = React.useState(false)
  const [switchingOrg, setSwitchingOrg] = React.useState<string | null>(null)
  const [orgs, setOrgs] = React.useState<{ id: string; name: string; slug: string }[]>([])

  const initials = (user.name || user.email)
    .split(/[\s@]/g)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // Fetch the admin's workspace memberships so they can "view as"
  // any of them.
  React.useEffect(() => {
    let cancelled = false
    fetch("/api/me/routing", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.orgs) setOrgs(d.orgs)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function viewAsWorkspace(orgId: string) {
    setSwitchingOrg(orgId)
    console.log(`[NAV-USER] view as workspace ${orgId}`)
    try {
      const r = await fetch("/api/admin/view-as-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const org = orgs.find((o) => o.id === orgId)
      toast.success(`Switched to ${org?.name ?? "workspace"}`)
      router.push("/dashboard")
    } catch (e) {
      console.error(`[NAV-USER] view-as-workspace failed:`, e)
      toast.error("Failed to switch workspace")
    } finally {
      setSwitchingOrg(null)
    }
  }

  async function signOut() {
    setSigningOut(true)
    console.log(`[NAV-USER] sign out ${user.email}`)
    try {
      await authClient.signOut()
      toast.success("Signed out")
      router.push("/login")
    } catch (e) {
      console.error(`[NAV-USER] sign out failed:`, e)
      toast.error((e as Error).message || "Sign out failed")
      setSigningOut(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-brand-ink text-brand-cream text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-brand-muted-soft">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-brand-muted-soft" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 min-w-56 rounded-lg border-brand-rule bg-brand-card"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Identity header */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                  <Avatar className="size-9 rounded-lg">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-brand-ink text-brand-cream text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-brand-ink">{user.name}</span>
                    <span className="truncate text-xs text-brand-muted-soft">
                      {user.email}
                    </span>
                    <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded bg-brand-accent-tint px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.04em] text-brand-accent">
                      <ShieldAlert className="size-2.5" />
                      superadmin
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            {impersonatedBy && (
              <>
                <DropdownMenuSeparator className="bg-brand-rule" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Impersonation
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    render={<Link href="/admin" />}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="mr-2 size-4 text-brand-muted-soft" />
                    <span className="flex flex-col">
                      <span className="text-sm">View as {user.email}</span>
                      <span className="font-mono text-[10px] text-brand-muted-soft">
                        started by {impersonatedBy}
                      </span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator className="bg-brand-rule" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Account
              </DropdownMenuLabel>
              <DropdownMenuItem className="cursor-pointer">
                <UserCog className="mr-2 size-4 text-brand-muted-soft" />
                Account settings
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {orgs.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-brand-rule" />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <Building2 className="mr-2 size-4 text-brand-muted-soft" />
                      <span>View as workspace</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="min-w-56 border-brand-rule bg-brand-card">
                      {orgs.map((o) => (
                        <DropdownMenuItem
                          key={o.id}
                          onClick={() => viewAsWorkspace(o.id)}
                          disabled={switchingOrg === o.id}
                          className="cursor-pointer"
                        >
                          {switchingOrg === o.id ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Building2 className="mr-2 size-4 text-brand-muted-soft" />
                          )}
                          <span className="flex flex-col">
                            <span className="text-sm">{o.name}</span>
                            <span className="font-mono text-[10px] text-brand-muted-soft">
                              /{o.slug}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator className="bg-brand-rule" />
            <DropdownMenuItem
              variant="destructive"
              onClick={signOut}
              disabled={signingOut}
              className="cursor-pointer text-brand-accent focus:bg-brand-accent-tint focus:text-brand-accent"
            >
              <LogOut className="mr-2 size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
