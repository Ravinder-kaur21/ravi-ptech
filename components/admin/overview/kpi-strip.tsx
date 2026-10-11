"use client"

/**
 * KPI strip — the 4 primary metrics on the /admin home page.
 *
 * Real data, hover hints, delta indicators. Shadcn Card + Badge +
 * HoverCard + Skeleton.
 */
import * as React from "react"
import Link from "next/link"
import {
  Users,
  Building2,
  Pause,
  Inbox,
  TrendingUp,
  TrendingDown,
  Info,
  type LucideIcon,
} from "lucide-react"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: number
  delta?: { value: number; direction: "up" | "down" | "flat" }
  href?: string
  icon: LucideIcon
  tone?: "default" | "warn" | "danger" | "info"
  hint: string
  hintTitle: string
}

export function KpiStrip({
  kpis,
  loading,
}: {
  kpis: {
    totalUsers: number
    usersDelta7d: number
    totalOrgs: number
    orgsDelta7d: number
    suspended: number
    openAppeals: number
  } | null
  loading?: boolean
}) {
  console.log("[OVERVIEW/KPI] rendering", { kpis, loading })
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const cards: Stat[] = [
    {
      label: "Total users",
      value: kpis.totalUsers,
      delta:
        kpis.usersDelta7d > 0
          ? { value: kpis.usersDelta7d, direction: "up" }
          : kpis.usersDelta7d < 0
            ? { value: Math.abs(kpis.usersDelta7d), direction: "down" }
            : undefined,
      href: "/admin/users",
      icon: Users,
      hint: "Every signed-up account across all workspaces.",
      hintTitle: "What is a user?",
    },
    {
      label: "Workspaces",
      value: kpis.totalOrgs,
      delta:
        kpis.orgsDelta7d > 0
          ? { value: kpis.orgsDelta7d, direction: "up" }
          : kpis.orgsDelta7d < 0
            ? { value: Math.abs(kpis.orgsDelta7d), direction: "down" }
            : undefined,
      href: "/admin/workspaces",
      icon: Building2,
      hint: "One per organization. Includes test workspaces.",
      hintTitle: "What is a workspace?",
    },
    {
      label: "Suspended",
      value: kpis.suspended,
      href: "/admin/users?status=suspended",
      icon: Pause,
      tone: kpis.suspended > 0 ? "warn" : "default",
      hint: "Users who can submit an appeal. Lift the suspension to restore access.",
      hintTitle: "Suspension vs ban",
    },
    {
      label: "Open appeals",
      value: kpis.openAppeals,
      href: "/admin/appeals",
      icon: Inbox,
      tone: kpis.openAppeals > 0 ? "info" : "default",
      hint: "Suspension appeals waiting for admin review. Approving lifts the suspension immediately.",
      hintTitle: "How appeals work",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((s) => (
        <KpiCard key={s.label} stat={s} />
      ))}
    </div>
  )
}

function KpiCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon
  const toneRing =
    stat.tone === "warn"
      ? "ring-amber-200/60"
      : stat.tone === "danger"
        ? "ring-red-200/60"
        : stat.tone === "info"
          ? "ring-blue-200/60"
          : "ring-brand-rule"

  const inner = (
    <Card
      className={cn(
        "@container/card group/card border-brand-rule bg-brand-card shadow-xs transition-all",
        stat.href && "hover:border-brand-ink/30 hover:shadow-sm"
      )}
    >
      <CardHeader>
        <CardDescription className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          <Icon
            className={cn(
              "size-3.5",
              stat.tone === "warn" && "text-amber-700",
              stat.tone === "danger" && "text-red-700",
              stat.tone === "info" && "text-blue-700"
            )}
          />
          {stat.label}
          <HoverCard>
            <HoverCardTrigger
              render={<button className="ml-0.5 text-brand-muted-soft hover:text-brand-ink" />}
            >
              <Info className="size-3" />
            </HoverCardTrigger>
            <HoverCardContent className="w-64 border-brand-rule bg-brand-card text-[12px]">
              <p className="font-medium text-brand-ink">{stat.hintTitle}</p>
              <p className="mt-1 text-brand-muted-soft">{stat.hint}</p>
            </HoverCardContent>
          </HoverCard>
        </CardDescription>
        <CardTitle className="font-serif text-3xl font-normal tracking-tight tabular-nums @[250px]/card:text-4xl text-brand-ink">
          {stat.value.toLocaleString()}
        </CardTitle>
        {stat.delta && (
          <Badge
            variant="outline"
            className={cn(
              "ml-auto items-center gap-1 font-mono text-[9px] uppercase tracking-[0.04em]",
              stat.delta.direction === "up" &&
                "border-emerald-300 bg-emerald-50 text-emerald-900",
              stat.delta.direction === "down" &&
                "border-red-300 bg-red-50 text-red-900"
            )}
          >
            {stat.delta.direction === "up" ? (
              <TrendingUp className="size-2.5" />
            ) : (
              <TrendingDown className="size-2.5" />
            )}
            {stat.delta.direction === "up" ? "+" : "-"}
            {stat.delta.value} 7d
          </Badge>
        )}
        {stat.href && (
          <span className="ml-auto text-brand-muted-soft group-hover/card:text-brand-ink">
            →
          </span>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-[12px] text-brand-muted-soft">
        <p className="line-clamp-2 leading-snug">{stat.hint}</p>
      </CardFooter>
    </Card>
  )

  return stat.href ? (
    <Link
      href={stat.href}
      className={cn(
        "block rounded-xl ring-1 ring-transparent transition-all",
        toneRing,
        "hover:ring-current/20"
      )}
    >
      {inner}
    </Link>
  ) : (
    inner
  )
}
