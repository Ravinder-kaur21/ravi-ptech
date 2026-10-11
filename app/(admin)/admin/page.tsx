import Link from "next/link"
import {
  Users,
  Building2,
  ShieldOff,
  Pause,
  Inbox,
  Mail,
  ScrollText,
  ArrowUpRight,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { getAdminStats } from "@/lib/dal"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Server actions / dynamic data — opt out of instant-navigation validation
export const instant = false

export default async function AdminHomePage() {
  console.log("[ADMIN/HOME] rendering")
  const stats = await getAdminStats()
  console.log("[ADMIN/HOME] stats:", stats)

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1200px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="size-[7px] shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            SUPERADMIN CONSOLE
          </span>
          <span className="font-mono text-[11px] tracking-[0.04em] text-brand-muted-soft">
            · SYSTEM-WIDE OVERVIEW
          </span>
        </div>
        <h1 className="mt-4 font-serif text-[clamp(32px,4vw,44px)] leading-[1.05] tracking-tight text-brand-ink">
          Muvx is <span className="italic text-brand-accent">healthy</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-ink/80">
          Manage every user, every workspace, and every audit event across the
          entire platform. Use with care — admin actions are logged.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={stats.totalUsers}
          href="/admin/users"
        />
        <StatCard
          icon={Pause}
          label="Suspended"
          value={stats.suspendedUsers}
          accent={stats.suspendedUsers > 0 ? "warn" : undefined}
          href="/admin/users?status=suspended"
        />
        <StatCard
          icon={ShieldOff}
          label="Banned"
          value={stats.bannedUsers}
          accent={stats.bannedUsers > 0 ? "danger" : undefined}
        />
        <StatCard
          icon={Building2}
          label="Workspaces"
          value={stats.totalOrgs}
          href="/admin/workspaces"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          label="Open appeals"
          value={stats.openAppeals}
          accent={stats.openAppeals > 0 ? "info" : undefined}
          href="/admin/appeals"
        />
        <StatCard
          icon={Mail}
          label="Pending invites"
          value={stats.pendingInvitations}
        />
        <StatCard
          icon={Users}
          label="Total members"
          value={stats.totalMembers}
        />
        <div />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-brand-ink">
              <span className="italic text-brand-accent">Quick actions</span>
            </h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              v1
            </Badge>
          </div>
          <div className="space-y-2">
            <QuickAction
              href="/admin/users"
              icon={Users}
              label="Manage users"
              hint="Search, ban, impersonate, set role, remove"
            />
            <QuickAction
              href="/admin/workspaces"
              icon={Building2}
              label="Manage workspaces"
              hint="View every organization, delete test workspaces"
            />
            <QuickAction
              href="/admin/audit"
              icon={ScrollText}
              label="Audit log"
              hint="Trace admin actions across the platform"
            />
          </div>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-accent" />
            <h2 className="font-serif text-lg text-brand-ink">
              <span className="italic text-brand-accent">Safety</span>
            </h2>
          </div>
          <ul className="space-y-2.5 text-sm text-brand-ink/80">
            <li>
              <strong className="text-brand-ink">Impersonation</strong> lasts
              30 minutes. The amber banner above the chrome tells you when it
              is active.
            </li>
            <li>
              <strong className="text-brand-ink">Banning a user</strong>{" "}
              revokes all their sessions immediately. Default expiry is 30 days.
            </li>
            <li>
              <strong className="text-brand-ink">Removing a user</strong>{" "}
              deletes them and every record that points at them. There is no
              undo.
            </li>
            <li>
              <strong className="text-brand-ink">Removing a workspace</strong>{" "}
              deletes the org and every tenant record (loads, drivers, etc.).
              There is no undo.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: number
  href?: string
  accent?: "warn" | "danger" | "info"
}) {
  const accentClass =
    accent === "warn"
      ? "bg-amber-100 text-amber-900"
      : accent === "danger"
        ? "bg-red-100 text-red-900"
        : accent === "info"
          ? "bg-blue-100 text-blue-900"
          : "bg-brand-accent-tint text-brand-accent"
  const inner = (
    <Card
      className={`border-brand-rule bg-brand-card p-5 transition-colors ${
        href ? "hover:border-brand-ink/30 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${accentClass}`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        {href && (
          <ArrowUpRight className="size-4 text-brand-muted-soft" />
        )}
      </div>
      <p className="font-serif text-3xl tracking-tight text-brand-ink">
        {value.toLocaleString()}
      </p>
      <p className="text-xs mt-0.5 text-brand-muted-soft">{label}</p>
    </Card>
  )
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
  badge,
}: {
  href: string
  icon: LucideIcon
  label: string
  hint: string
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg p-2.5 -mx-2.5 hover:bg-brand-cream-soft transition-colors group"
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-brand-ink text-brand-cream group-hover:bg-brand-ink-soft">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-brand-ink">{label}</p>
          {badge !== undefined && badge > 0 && (
            <Badge
              variant="outline"
              className="border-blue-300 bg-blue-50 text-blue-900 font-mono text-[9px] uppercase tracking-[0.04em]"
            >
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-brand-muted-soft">{hint}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-brand-muted-soft group-hover:text-brand-ink" />
    </Link>
  )
}