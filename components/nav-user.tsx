"use client"

import * as React from "react"
import Link from "next/link"
import {
  MoreVertical,
  CreditCard,
  Eye,
  LogOut,
  Settings,
  Sparkles,
  UserCog,
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
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { toast } from "sonner"

type NavUserProps = {
  user: {
    userId: string
    userName: string
    userEmail: string
    userImage: string | null
    userRole: string
  }
  /** When true, shows a "Stop impersonating" item at the top of the dropdown. */
  isImpersonating?: boolean
}

/**
 * Footer identity card for the sidebar. Mirrors the sidebar-07 footer
 * pattern: avatar + name/email trigger a dropdown with profile, settings,
 * billing, switch workspace, and sign out. Adapted to the Muvx brand.
 *
 * When `isImpersonating` is true, an amber "Stop impersonating" item appears
 * at the top so superadmins can exit quickly from anywhere in the app.
 */
export function NavUser({
  user,
  isImpersonating = false,
}: NavUserProps) {
  const reset = useAuthStore((s) => s.reset)
  const { isMobile } = useSidebar()

  const initials = user.userName
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const handleStopImpersonating = async () => {
    console.log("[NAV-USER] stopping impersonation")
    try {
      await authClient.admin.stopImpersonating()
      console.log("[NAV-USER] ✅ impersonation stopped")
      toast.success("Returned to your admin session")
      window.location.href = "/admin"
    } catch (err) {
      console.error("[NAV-USER] stopImpersonating failed:", err)
      toast.error("Failed to stop impersonating")
    }
  }

  const handleSignOut = async () => {
    console.log("[NAV-USER] signing out")
    try {
      await authClient.signOut()
    } catch (err) {
      console.error("[NAV-USER] signOut error:", err)
    }
    reset()
    // Hard navigate so the auth-cookie / session-cached UI is fully reset.
    console.log("[NAV-USER] redirecting to /login")
    window.location.href = "/login"
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-md">
              <AvatarImage src={user.userImage ?? undefined} alt={user.userName} />
              <AvatarFallback className="rounded-md bg-brand-accent text-brand-cream text-[11px] font-semibold">
                {initials || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-semibold text-brand-ink text-[13px]">
                {user.userName}
              </span>
              <span className="truncate font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                {user.userRole}
              </span>
            </div>
            <MoreVertical className="ml-auto size-[18px] text-brand-muted-soft" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg border-brand-rule bg-brand-card p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Stop impersonating — amber, only while impersonating */}
            {isImpersonating && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={handleStopImpersonating}
                    className="rounded-md cursor-pointer text-amber-900 focus:text-amber-950 bg-amber-50 focus:bg-amber-100"
                  >
                    <Eye className="mr-2 size-4" />
                    Stop impersonating
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-brand-rule" />
              </>
            )}

            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-brand-ink">
                    {user.userName}
                  </span>
                  <span className="text-[11px] text-brand-muted-soft">
                    {user.userEmail}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-brand-rule" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings/profile"
                    className="rounded-md cursor-pointer"
                  />
                }
              >
                <UserCog className="mr-2 size-4 text-brand-muted-soft" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link href="/settings" className="rounded-md cursor-pointer" />
                }
              >
                <Settings className="mr-2 size-4 text-brand-muted-soft" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings/billing"
                    className="rounded-md cursor-pointer"
                  />
                }
              >
                <CreditCard className="mr-2 size-4 text-brand-muted-soft" />
                Billing
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-brand-rule" />
            <DropdownMenuItem
              render={
                <Link href="/select-org" className="rounded-md cursor-pointer" />
              }
            >
              <Sparkles className="mr-2 size-4 text-brand-accent" />
              Switch workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-brand-rule" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="rounded-md cursor-pointer text-brand-accent focus:text-brand-accent"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
