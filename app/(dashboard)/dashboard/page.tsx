import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Truck,
  MapPin,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Plus,
  Clock,
  AlertCircle,
  type LucideIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getSession,
  getActiveLoadsCount,
  getMonthlyRevenue,
  getActiveDriversCount,
  getLoadsForOrg,
} from "@/lib/dal"
import { StatusBadge } from "@/components/status-badge"

// Server actions / dynamic data — opt out of instant-navigation validation
export const instant = false

export default async function DashboardHomePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  // [DASHBOARD] Fetch all KPIs in parallel
  const [activeLoads, monthlyRevenue, activeDrivers, recentLoads] =
    await Promise.all([
      getActiveLoadsCount(tenantId),
      getMonthlyRevenue(tenantId),
      getActiveDriversCount(tenantId),
      getLoadsForOrg(tenantId),
    ])

  const greeting =
    new Date().getHours() < 12 ? "Good morning" :
    new Date().getHours() < 18 ? "Good afternoon" :
    "Good evening"
  const firstName = session.user.name?.split(" ")[0] || "there"
  const formatCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
          {greeting}, <span className="italic text-brand-accent">{firstName}</span>.
        </h1>
        <p className="mt-1 text-sm text-brand-ink/80">
          Here&apos;s what&apos;s happening with your fleet today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active loads" value={String(activeLoads)} icon={Truck} />
        <KpiCard label="Drivers on road" value={String(activeDrivers)} icon={MapPin} />
        <KpiCard label="Revenue MTD" value={formatCurrency(monthlyRevenue)} icon={DollarSign} />
        <KpiCard label="On-time %" value="—" icon={CheckCircle2} hint="Available after first delivery" />
      </div>

      {/* Active loads + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-brand-rule bg-brand-card overflow-hidden">
          <div className="border-b border-brand-rule p-5 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-brand-ink">Recent loads</h2>
              <p className="text-xs mt-0.5 text-brand-muted-soft">
                {recentLoads.length} total · {activeLoads} active
              </p>
            </div>
            <Link
              href="/loads"
              className="h-9 px-4 inline-flex items-center justify-center rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm transition-colors"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>

          {recentLoads.length === 0 ? (
            <EmptyActiveLoads />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-rule bg-brand-cream-soft/50">
                    <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                      Load
                    </th>
                    <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                      Customer
                    </th>
                    <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                      Route
                    </th>
                    <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                      Status
                    </th>
                    <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoads.slice(0, 8).map((ld: any) => (
                    <tr
                      key={ld.id}
                      className="border-b border-brand-rule last:border-0 hover:bg-brand-cream-soft/50"
                    >
                      <td className="px-5 py-3 font-mono text-[13px] text-brand-ink">
                        <Link href={`/loads/${ld.id}`} className="hover:underline">
                          {ld.loadNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-brand-ink/80">
                        {ld.customerName || "—"}
                      </td>
                      <td className="px-5 py-3 text-brand-ink/80">
                        {ld.originCity && ld.destCity
                          ? `${ld.originCity}, ${ld.originState} → ${ld.destCity}, ${ld.destState}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={ld.status} />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] text-brand-ink">
                        {ld.rate ? `$${ld.rate}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="border-brand-rule bg-brand-card p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] mb-3 text-brand-muted-soft">
              Quick actions
            </h3>
            <div className="space-y-2">
              <QuickAction
                href="/loads/new"
                icon={Plus}
                label="Create new load"
                hint="Dispatch a load in under 60 seconds"
              />
              <QuickAction
                href="/trips"
                icon={MapPin}
                label="View trips"
                hint="See all active and completed trips"
              />
              <QuickAction
                href="/invoices"
                icon={DollarSign}
                label="Send invoice"
                hint="Bill a delivered load instantly"
              />
            </div>
          </Card>

          <Card className="border-brand-rule bg-brand-card p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] mb-3 text-brand-muted-soft">
              Get started
            </h3>
            <div className="space-y-2.5">
              <AttentionItem
                icon={Truck}
                title="Add your trucks"
                description="Add trucks to your fleet to start dispatching"
                href="/fleet"
              />
              <AttentionItem
                icon={Clock}
                title="Invite your drivers"
                description="Invite drivers and assign them to your trucks"
                href="/drivers"
              />
              <AttentionItem
                icon={AlertCircle}
                title="Configure billing"
                description="Set up your rates and customer info"
                href="/settings"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
}) {
  return (
    <Card className="border-brand-rule bg-brand-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
      </div>
      <p className="font-serif text-3xl tracking-tight text-brand-ink">{value}</p>
      <p className="text-xs mt-0.5 text-brand-muted-soft">{label}</p>
      {hint && (
        <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">{hint}</p>
      )}
    </Card>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string
  icon: LucideIcon
  label: string
  hint: string
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
        <p className="text-sm font-medium text-brand-ink">{label}</p>
        <p className="text-[11px] text-brand-muted-soft">{hint}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-brand-muted-soft group-hover:text-brand-ink" />
    </Link>
  )
}

function AttentionItem({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-2.5 rounded-lg p-2 -mx-2 hover:bg-brand-cream-soft transition-colors"
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-brand-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand-ink">{title}</p>
        <p className="text-[11px] mt-0.5 text-brand-muted-soft">{description}</p>
      </div>
    </Link>
  )
}

function EmptyActiveLoads() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
        <Truck className="h-5 w-5 text-brand-accent" />
      </div>
      <p className="text-sm font-medium text-brand-ink">No loads yet</p>
      <p className="text-xs mt-1 max-w-xs mx-auto text-brand-muted-soft">
        Create your first load to start dispatching. You can also import loads from another TMS.
      </p>
      <Link
        href="/loads/new"
        className="mt-4 h-9 px-4 inline-flex items-center justify-center rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm transition-colors"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Create your first load
      </Link>
    </div>
  )
}
