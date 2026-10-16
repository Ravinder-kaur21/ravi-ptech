"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Bell,
  LogOut,
  UserCog,
  Settings,
  CreditCard,
  ShieldCheck,
  Eye,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { usePermissions } from "@/lib/permissions-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Kbd } from "@/components/ui/kbd"
import { CommandPalette } from "@/components/command-palette"
import { QuickCreateLoad } from "@/components/quick-create-load"
import { toast } from "sonner"

export function SiteHeader({
  userName,
  userEmail,
  userImage,
  isImpersonating = false,
}: {
  userName: string
  userEmail: string
  userImage: string | null
  isImpersonating?: boolean
}) {
  const router = useRouter()
  const reset = useAuthStore((s) => s.reset)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)

  const perms = usePermissions()
  const canCreateLoad = perms.has("loads.create")

  // [SITE-HEADER] ⌘K / Ctrl+K to open command palette
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // [SITE-HEADER] "C" to quick-create a load (when not in an input)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!canCreateLoad) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = (e.target as HTMLElement)?.tagName
      if (t === "INPUT" || t === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === "c" || e.key === "C") {
        e.preventDefault()
        setCreateOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [canCreateLoad])

  const handleStopImpersonating = async () => {
    console.log("[SITE-HEADER] stopping impersonation")
    try {
      await authClient.admin.stopImpersonating()
      console.log("[SITE-HEADER] ✅ impersonation stopped")
      toast.success("Returned to your admin session")
      window.location.href = "/admin"
    } catch (err) {
      console.error("[SITE-HEADER] stopImpersonating failed:", err)
      toast.error("Failed to stop impersonating")
    }
  }

  const handleSignOut = async () => {
    console.log("[SITE-HEADER] signing out")
    await authClient.signOut()
    reset()
    router.push("/login")
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-brand-rule bg-brand-card px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 lg:px-6">
        <SidebarTrigger className="-ml-1 text-brand-ink/80 hover:text-brand-ink hover:bg-brand-cream-soft" />

        <Separator orientation="vertical" className="mx-1 h-4 bg-brand-rule" />

        <PathBreadcrumb />

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* ⌘K search */}
          <Button
            variant="ghost"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:inline-flex h-9 w-44 justify-start gap-2 px-3 text-brand-muted-soft hover:bg-brand-cream-soft hover:text-brand-ink"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-[13px] font-normal">Search</span>
            <Kbd className="ml-auto">⌘K</Kbd>
          </Button>

          {/* + New load */}
          {canCreateLoad && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 gap-1.5 rounded-full bg-brand-ink px-4 text-[13px] font-medium text-brand-cream hover:bg-brand-ink-soft"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New load</span>
            </Button>
          )}

          {/* Bell */}
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/notifications" />}
            className="text-brand-ink/80 hover:text-brand-ink hover:bg-brand-cream-soft relative"
          >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-9 w-9 rounded-full p-0 hover:bg-brand-cream-soft"
                />
              }
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={userImage ?? undefined} alt={userName} />
                <AvatarFallback className="bg-brand-accent text-brand-cream text-xs font-semibold rounded-full">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-lg border-brand-rule bg-brand-card p-1"
              align="end"
              sideOffset={4}
            >
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
                    <span className="text-[13px] font-medium text-brand-ink">{userName}</span>
                    <span className="text-[11px] text-brand-muted-soft">{userEmail}</span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-brand-rule" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={<Link href="/settings/profile" className="rounded-md cursor-pointer" />}
                >
                  <UserCog className="mr-2 size-4 text-brand-muted-soft" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/settings" className="rounded-md cursor-pointer" />}
                >
                  <Settings className="mr-2 size-4 text-brand-muted-soft" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/settings/billing" className="rounded-md cursor-pointer" />}
                >
                  <CreditCard className="mr-2 size-4 text-brand-muted-soft" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/admin" className="rounded-md cursor-pointer" />}
                >
                  <ShieldCheck className="mr-2 size-4 text-brand-accent" />
                  Admin console
                </DropdownMenuItem>
              </DropdownMenuGroup>
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
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <QuickCreateLoad open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

// ─── Path-driven breadcrumb using the shadcn Breadcrumb primitive ──────
function PathBreadcrumb() {
  const pathname = usePathname()
  const segs = pathname.split("/").filter(Boolean)
  if (segs.length === 0) return null
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList className="font-geist text-[13px]">
        {segs.map((seg, i) => {
          const href = "/" + segs.slice(0, i + 1).join("/")
          const isLast = i === segs.length - 1
          const label = seg
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
          return (
            <React.Fragment key={href}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium text-brand-ink">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link href={href} />}
                    className="text-brand-muted-soft hover:text-brand-ink transition-colors"
                  >
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
