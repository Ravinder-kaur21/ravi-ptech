import { requireAdmin, getAdminOverview } from "@/lib/dal"
import { getSession } from "@/lib/dal"
import { ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { KpiStrip } from "@/components/admin/overview/kpi-strip"
import { SecondaryTiles } from "@/components/admin/overview/secondary-tiles"
import { SignupsChart } from "@/components/admin/overview/signups-chart"
import { RecentActivity } from "@/components/admin/overview/recent-activity"
import { QuickActions } from "@/components/admin/overview/quick-actions"
import { SystemHealth } from "@/components/admin/overview/system-health"

import { connection } from "next/server"

export const instant = false

export default async function AdminHomePage() {
  await connection()
  console.log("[ADMIN/HOME] rendering")
  const [admin, overview, session] = await Promise.all([
    requireAdmin(),
    getAdminOverview(),
    getSession(),
  ])
  const impersonatedBy = (session?.session as any)?.impersonatedBy ?? null
  console.log(
    `[ADMIN/HOME] overview kpis: users=${overview.kpis.totalUsers} orgs=${overview.kpis.totalOrgs} appeals=${overview.kpis.openAppeals}`
  )

  return (
    <>
      {/* ── Page title row ── */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
                SUPERADMIN CONSOLE
              </span>
              <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
                · SYSTEM-WIDE OVERVIEW
              </span>
            </div>
            <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
              Welcome back,{" "}
              <span className="italic text-brand-accent">
                {admin.userName.split(" ")[0]}
              </span>
              .
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
              Every user, every workspace, every audit event — in one place.
              Use with care. Every action is logged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {overview.impersonation.active ? (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 font-mono text-[10px] uppercase tracking-[0.04em] text-amber-900"
              >
                <Sparkles className="mr-1 size-3" />
                Impersonating
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-brand-rule bg-brand-card font-mono text-[10px] uppercase tracking-[0.04em]"
              >
                <ShieldCheck className="mr-1 size-3" />
                v1
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <KpiStrip kpis={overview.kpis} />

      {/* ── Signups chart ── */}
      <div className="px-4 lg:px-6">
        <SignupsChart />
      </div>

      {/* ── Secondary tiles (banned / invites / failed-24h / sessions / impersonation) ── */}
      <SecondaryTiles
        stats={{
          banned: overview.kpis.banned,
          pendingInvitations: overview.kpis.pendingInvitations,
          failedSignups24h: overview.kpis.failedSignups24h,
          activeSessions: overview.kpis.activeSessions,
          impersonation: overview.impersonation,
        }}
      />

      {/* ── Bottom row: quick actions + recent activity + system health ── */}
      <div className="grid gap-4 px-4 lg:px-6 @5xl/main:grid-cols-3">
        <QuickActions />
        <RecentActivity events={overview.recentEvents} />
        <SystemHealth health={overview.systemHealth} />
      </div>
    </>
  )
}
