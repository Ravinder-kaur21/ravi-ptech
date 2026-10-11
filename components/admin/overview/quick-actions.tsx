"use client"

/**
 * QuickActions — 4-tile action grid on the /admin home page.
 */
import * as React from "react"
import Link from "next/link"
import {
  Users,
  Building2,
  Inbox,
  ScrollText,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ACTIONS: { href: string; icon: LucideIcon; label: string; hint: string }[] = [
  {
    href: "/admin/users",
    icon: Users,
    label: "Manage users",
    hint: "Search, ban, suspend, impersonate, set role, delete",
  },
  {
    href: "/admin/workspaces",
    icon: Building2,
    label: "Manage workspaces",
    hint: "View every organization across every tenant",
  },
  {
    href: "/admin/appeals",
    icon: Inbox,
    label: "Review appeals",
    hint: "Approve or deny open suspension appeals",
  },
  {
    href: "/admin/audit",
    icon: ScrollText,
    label: "Audit log",
    hint: "Trace every admin action across the platform",
  },
]

export function QuickActions() {
  console.log("[OVERVIEW/QUICK-ACTIONS] rendering")
  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardHeader>
        <CardTitle className="font-serif text-lg tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Quick actions</span>
        </CardTitle>
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          The four actions you&apos;ll use most
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-lg border border-brand-rule bg-brand-card p-3 transition-all hover:border-brand-ink/30 hover:shadow-sm"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-ink text-brand-cream">
              <a.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-ink">{a.label}</p>
              <p className="line-clamp-1 text-[11px] text-brand-muted-soft">{a.hint}</p>
            </div>
            <ArrowUpRight className="size-4 text-brand-muted-soft transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-ink" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
