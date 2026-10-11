"use client"

/**
 * SiteHeader — the top bar of the admin console.
 * Pattern: shadcn dashboard-01 site-header with Muvx brand.
 *
 * Contains:
 *   - SidebarTrigger (collapse to icon mode, persisted in cookie)
 *   - Separator
 *   - Breadcrumb (derived from URL via usePathname — no per-page prop)
 *   - Spacer
 *   - Search trigger (Cmd-K palette) — right-aligned
 *   - Theme indicator (decorative, no toggle in v1)
 */
import * as React from "react"
import { usePathname } from "next/navigation"
import { Search, ShieldCheck } from "lucide-react"
import {
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Overview",
  "/admin/users": "Users",
  "/admin/workspaces": "Workspaces",
  "/admin/appeals": "Appeals",
  "/admin/security": "Security",
  "/admin/flags": "Feature flags",
  "/admin/comms": "Communications",
  "/admin/audit": "Audit log",
}

function deriveCrumbs(pathname: string): { label: string; href: string }[] {
  const parts = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []
  let acc = ""
  for (const part of parts) {
    acc += `/${part}`
    const label = ROUTE_LABELS[acc] ?? (part.charAt(0).toUpperCase() + part.slice(1))
    crumbs.push({ label, href: acc })
  }
  return crumbs
}

export function SiteHeader() {
  const pathname = usePathname()
  const crumbs = deriveCrumbs(pathname)
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-brand-rule bg-brand-card/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-brand-card/70 transition-[width,height] ease-linear",
        "group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
      )}
    >
      <SidebarTrigger className="-ml-1 size-7" />
      <Separator
        orientation="vertical"
        className="mr-1 h-4 data-vertical:self-auto"
      />

      {/* Brand pill (visible only when sidebar is collapsed — replaces the
          sidebar logo so you can still see which console you're in) */}
      {collapsed && (
        <div className="flex items-center gap-1.5 md:hidden">
          <div className="flex size-5 items-center justify-center rounded bg-brand-ink text-brand-cream">
            <ShieldCheck className="size-3" />
          </div>
          <span className="font-serif text-[13px] font-semibold text-brand-ink">
            Muvx<span className="text-brand-accent"> Admin</span>
          </span>
        </div>
      )}

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <React.Fragment key={c.href}>
                {i > 0 && (
                  <BreadcrumbSeparator className="text-brand-muted-soft/50" />
                )}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-serif text-[15px] tracking-tight text-brand-ink">
                      {c.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={c.href}
                      className="font-mono text-[11px] uppercase tracking-[0.04em] text-brand-muted-soft hover:text-brand-ink"
                    >
                      {c.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search trigger — opens the global Cmd-K palette */}
      <SearchTrigger />
    </header>
  )
}

function SearchTrigger() {
  const [isMac, setIsMac] = React.useState(false)
  React.useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform))
  }, [])
  const onOpen = () => {
    window.dispatchEvent(new CustomEvent("admin:open-search"))
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onOpen}
      className="h-7 gap-2 border-brand-rule bg-brand-card text-brand-muted-soft hover:bg-brand-cream-soft hover:text-brand-ink"
    >
      <Search className="size-3.5" />
      <span className="hidden text-[12px] md:inline">Search users, workspaces, appeals…</span>
      <span className="md:hidden text-[12px]">Search</span>
      <Kbd className="ml-1 hidden md:inline-flex">{isMac ? "⌘" : "Ctrl"}</Kbd>
      <Kbd className="hidden md:inline-flex">K</Kbd>
    </Button>
  )
}
