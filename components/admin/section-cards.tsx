/**
 * SectionCards — the KPI strip on the admin Overview page.
 *
 * Pattern: shadcn dashboard-01 SectionCards, themed to Muvx
 * (cream surface, ink numerals, orange delta indicators, serif
 * numerals via font-serif).
 *
 * The four primary KPIs are pulled from getAdminStats() (the same
 * data the old /admin page used). The fifth card is a status
 * strip that always renders the impersonation state if active.
 */
import * as React from "react"
import Link from "next/link"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Building2,
  ShieldOff,
  Pause,
  Inbox,
  Mail,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: number
  href?: string
  icon: LucideIcon
  tone?: "default" | "warn" | "danger" | "info"
  /** Show a delta badge (percentage string, e.g. "+12.5%"). */
  delta?: { value: string; direction: "up" | "down" | "flat" }
  /** Helper text under the number. */
  hint: string
}

export function SectionCards({
  stats,
  impersonatedBy,
}: {
  stats: {
    totalUsers: number
    bannedUsers: number
    suspendedUsers: number
    totalOrgs: number
    openAppeals: number
    pendingInvitations: number
    totalMembers: number
  }
  impersonatedBy: string | null
}) {
  const cards: Stat[] = [
    {
      label: "Total users",
      value: stats.totalUsers,
      href: "/admin/users",
      icon: Users,
      hint: "Every signed-up account across all workspaces.",
    },
    {
      label: "Workspaces",
      value: stats.totalOrgs,
      href: "/admin/workspaces",
      icon: Building2,
      hint: `${stats.totalMembers.toLocaleString()} members across all tenants.`,
    },
    {
      label: "Suspended",
      value: stats.suspendedUsers,
      href: "/admin/users?status=suspended",
      icon: Pause,
      tone: stats.suspendedUsers > 0 ? "warn" : "default",
      hint:
        stats.suspendedUsers > 0
          ? "Users who can submit an appeal. Review the Appeals inbox."
          : "No active suspensions.",
    },
    {
      label: "Open appeals",
      value: stats.openAppeals,
      href: "/admin/appeals",
      icon: Inbox,
      tone: stats.openAppeals > 0 ? "info" : "default",
      hint:
        stats.openAppeals > 0
          ? "Suspension appeals waiting for admin review."
          : "Inbox is clear.",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((s) => (
        <KpiCard key={s.label} stat={s} />
      ))}

      {/* The 5th slot: a side-by-side "Banned" + "Invites" pair so the grid
          stays balanced on @5xl/main (4 cols) without inventing fake KPIs. */}
      <BannedInvitesPair
        banned={stats.bannedUsers}
        invites={stats.pendingInvitations}
        impersonatedBy={impersonatedBy}
      />
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
        </CardDescription>
        <CardTitle className="font-serif text-3xl font-normal tracking-tight tabular-nums @[250px]/card:text-4xl text-brand-ink">
          {stat.value.toLocaleString()}
        </CardTitle>
        {stat.href && (
          <span className="ml-auto text-brand-muted-soft group-hover/card:text-brand-ink">
            <ArrowUpRight className="size-3.5" />
          </span>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-[12px] text-brand-muted-soft">
        <p className="line-clamp-2 leading-snug">{stat.hint}</p>
      </CardFooter>
    </Card>
  )

  return stat.href ? (
    <Link href={stat.href} className={cn("block rounded-xl ring-1 ring-transparent", toneRing, "hover:ring-current/20")}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

function BannedInvitesPair({
  banned,
  invites,
  impersonatedBy,
}: {
  banned: number
  invites: number
  impersonatedBy: string | null
}) {
  return (
    <Card className="border-brand-rule bg-brand-card sm:col-span-2 @5xl/main:col-span-4">
      <CardHeader className="pb-3">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          System status
        </CardDescription>
      </CardHeader>
      <div className="grid grid-cols-2 divide-x divide-brand-rule sm:grid-cols-4">
        <StatusCell
          icon={ShieldOff}
          label="Banned"
          value={banned}
          tone={banned > 0 ? "danger" : "default"}
          href="/admin/users?status=banned"
          hint="All sessions revoked. No appeal screen."
        />
        <StatusCell
          icon={Mail}
          label="Pending invites"
          value={invites}
          href="/admin/users?status=invited"
          hint="Invitations not yet accepted."
        />
        <StatusCell
          icon={TrendingUp}
          label="Health"
          value={1}
          tone="info"
          hint="All systems operational."
        />
        <StatusCell
          icon={TrendingDown}
          label="Impersonation"
          value={impersonatedBy ? 1 : 0}
          tone={impersonatedBy ? "warn" : "default"}
          hint={
            impersonatedBy
              ? `Viewing as: ${impersonatedBy}`
              : "No active session."
          }
        />
      </div>
    </Card>
  )
}

function StatusCell({
  icon: Icon,
  label,
  value,
  href,
  tone,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: number
  href?: string
  tone?: "default" | "warn" | "danger" | "info"
  hint: string
}) {
  const valueColor =
    tone === "warn"
      ? "text-amber-900"
      : tone === "danger"
        ? "text-red-900"
        : "text-brand-ink"

  const inner = (
    <div className="flex flex-col gap-1 p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5",
            tone === "warn" && "text-amber-700",
            tone === "danger" && "text-red-700"
          )}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </span>
      </div>
      <span className={cn("font-serif text-2xl tracking-tight tabular-nums", valueColor)}>
        {value.toLocaleString()}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-brand-muted-soft">
        {hint}
      </span>
    </div>
  )

  return href ? (
    <Link href={href} className="block transition-colors hover:bg-brand-cream-soft">
      {inner}
    </Link>
  ) : (
    inner
  )
}
