"use client"

/**
 * Admin nav-user — the shadcn sidebar-07 pattern, adapted for Muvx.
 *
 * The "Back to app" link from the old admin-shell is intentionally
 * removed. (See CLAUDE.md — the (admin) route group is OUTSIDE
 * (dashboard), so there is no shared "app" surface to go back to. If
 * the admin is also an org owner, the (dashboard) nav is a separate
 * window — they sign into both via /login, not escape-hatch links.)
 *
 * The dropdown is "Account menu" only: open the admin profile sheet
 * (TODO), trigger impersonation banner status, and sign out.
 */
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { ChevronsUpDown, LogOut, UserCog, ShieldAlert, ExternalLink } from "lucide-react"
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

  const initials = (user.name || user.email)
    .split(/[\s@]/g)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function signOut() {
    setSigningOut(true)
    try {
      await authClient.signOut()
      toast.success("Signed out")
      router.push("/login")
    } catch (e) {
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
