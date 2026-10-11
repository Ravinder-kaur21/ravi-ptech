"use client"

/**
 * SecondaryTiles — 4-cell status strip beneath the KPI strip.
 * Real data: banned users, pending invites, failed signups 24h,
 * active sessions. Plus an impersonation-status badge that updates
 * from the session.
 */
import * as React from "react"
import Link from "next/link"
import {
  ShieldOff,
  Mail,
  AlertTriangle,
  Activity,
  UserCheck,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Tile = {
  label: string
  value: number
  href?: string
  icon: LucideIcon
  tone?: "default" | "warn" | "danger"
  hint: string
}

export function SecondaryTiles({
  stats,
  loading,
}: {
  stats: {
    banned: number
    pendingInvitations: number
    failedSignups24h: number
    activeSessions: number
    impersonation: { active: boolean; startedByEmail: string | null }
  } | null
  loading?: boolean
}) {
  console.log("[OVERVIEW/SECONDARY] rendering", { stats, loading })
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
        ))}
      </div>
    )
  }
  const tiles: Tile[] = [
    {
      label: "Banned",
      value: stats.banned,
      href: "/admin/users?status=banned",
      icon: ShieldOff,
      tone: stats.banned > 0 ? "danger" : "default",
      hint: "All sessions revoked. No appeal screen.",
    },
    {
      label: "Pending invites",
      value: stats.pendingInvitations,
      href: "/admin/users?status=invited",
      icon: Mail,
      hint: "Workspace invitations not yet accepted.",
    },
    {
      label: "Failed signups (24h)",
      value: stats.failedSignups24h,
      icon: AlertTriangle,
      tone: stats.failedSignups24h > 10 ? "warn" : "default",
      hint: "Higher than 10 = potential attack. Check the brute-force dashboard.",
    },
    {
      label: "Active sessions",
      value: stats.activeSessions,
      icon: Activity,
      hint: "Sessions not yet expired. Updated every render.",
    },
  ]
  return (
    <div className="px-4 lg:px-6">
      <Card className="border-brand-rule bg-brand-card">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-brand-rule sm:grid-cols-4">
            {tiles.map((t) => (
              <StatusCell key={t.label} tile={t} />
            ))}
          </div>
          {stats.impersonation.active && (
            <div className="flex items-center gap-2 border-t border-amber-300 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
              <UserCheck className="size-3.5" />
              <span>
                Impersonation active — started by{" "}
                <span className="font-mono font-medium">
                  {stats.impersonation.startedByEmail}
                </span>
                . Stops automatically in 30 minutes.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCell({ tile }: { tile: Tile }) {
  const Icon = tile.icon
  const valueColor =
    tile.tone === "warn"
      ? "text-amber-900"
      : tile.tone === "danger"
        ? "text-red-900"
        : "text-brand-ink"
  const inner = (
    <div className="flex flex-col gap-1 p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5",
            tile.tone === "warn" && "text-amber-700",
            tile.tone === "danger" && "text-red-700"
          )}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          {tile.label}
        </span>
      </div>
      <span className={cn("font-serif text-2xl tracking-tight tabular-nums", valueColor)}>
        {tile.value.toLocaleString()}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-brand-muted-soft">
        {tile.hint}
      </span>
    </div>
  )
  return tile.href ? (
    <Link href={tile.href} className="block transition-colors hover:bg-brand-cream-soft">
      {inner}
    </Link>
  ) : (
    inner
  )
}
