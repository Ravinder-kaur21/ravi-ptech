"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building2,
  Inbox,
  ScrollText,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { cn } from "@/lib/utils"

type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  description: string
}

const ADMIN_NAV: AdminNavItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    description: "System-wide stats",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Ban, suspend, impersonate, set role",
  },
  {
    label: "Appeals",
    href: "/admin/appeals",
    icon: Inbox,
    description: "Review user appeals",
  },
  {
    label: "Workspaces",
    href: "/admin/workspaces",
    icon: Building2,
    description: "List and delete organizations",
  },
  {
    label: "Audit log",
    href: "/admin/audit",
    icon: ScrollText,
    description: "Recent admin actions",
  },
]

/**
 * The admin shell — a custom chrome that runs only under /admin/*. Distinct
 * from the (dashboard) chrome so superadmins can manage the system without
 * needing an active organization.
 */
export function AdminShell({
  userName,
  userEmail,
  userImage,
  impersonatedBy,
  children,
}: {
  userName: string
  userEmail: string
  userImage: string | null
  impersonatedBy: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      {/* ─── Impersonation banner (sticky at top if active) ─── */}
      {impersonatedBy && (
        <ImpersonationBanner impersonatedByEmail={impersonatedBy} />
      )}

      <div className="flex min-h-screen">
        {/* ─── Admin sidebar ─── */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-rule bg-brand-card md:flex">
          {/* Brand */}
          <div className="flex h-14 items-center gap-3 border-b border-brand-rule px-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-ink text-brand-cream shrink-0">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[15px] font-semibold tracking-tight text-brand-ink">
                Muvx<span className="text-brand-accent"> Admin</span>
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Superadmin console
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 p-3">
            <p className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
              Console
            </p>
            {ADMIN_NAV.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    isActive
                      ? "bg-brand-ink text-brand-cream"
                      : "text-brand-ink/80 hover:bg-brand-cream-soft"
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 mt-0.5 shrink-0",
                      isActive ? "text-brand-cream" : "text-brand-muted-soft"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span
                      className={cn(
                        "block text-[11px]",
                        isActive ? "text-brand-cream/70" : "text-brand-muted-soft"
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                  {isActive && (
                    <ChevronRight className="size-3.5 mt-1 text-brand-cream/60" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer: back-to-app + identity */}
          <div className="border-t border-brand-rule p-3 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-ink/80 hover:bg-brand-cream-soft hover:text-brand-ink transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to app
            </Link>
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-brand-accent text-brand-cream text-[11px] font-semibold shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-brand-ink">
                  {userName}
                </p>
                <p className="truncate text-[10px] text-brand-muted-soft">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── Main content ─── */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}