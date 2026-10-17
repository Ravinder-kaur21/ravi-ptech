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
  ShieldCheck,
  FileText,
  Navigation,
  Users,
  Box,
  Receipt,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getSession,
  getActiveLoadsCount,
  getMonthlyRevenue,
  getActiveDriversCount,
  getLoadsForOrg,
  getTrucksForOrg,
  getDriversForOrg,
} from "@/lib/dal"
import { StatusBadge } from "@/components/status-badge"
import { getEffectivePermissions } from "@/lib/can"
import { RecordExpenseDialog } from "@/components/tms/record-expense-dialog"

export const instant = false

export default async function DashboardHomePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  // Parallel data fetching for instant response
  const [activeLoads, monthlyRevenue, activeDrivers, recentLoads, trucks, drivers, permissions] =
    await Promise.all([
      getActiveLoadsCount(tenantId),
      getMonthlyRevenue(tenantId),
      getActiveDriversCount(tenantId),
      getLoadsForOrg(tenantId),
      getTrucksForOrg(tenantId),
      getDriversForOrg(tenantId),
      getEffectivePermissions(session.user.id, tenantId),
    ])

  const canViewRevenue = permissions.has("invoices.module") || permissions.has("reports.module")
  const canCreateLoad = permissions.has("loads.create")
  const canViewTrips = permissions.has("trips.module") || permissions.has("trips.view_all")
  const canCreateInvoice = permissions.has("invoices.create")
  const canManageFleet = permissions.has("fleet.create") || permissions.has("fleet.module")
  const canInviteDrivers = permissions.has("drivers.create") || permissions.has("users.invite")
  const isDriverOnly = permissions.has("loads.view_own") && !permissions.has("loads.view_all")

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening"
  const firstName = session.user.name?.split(" ")[0] || "there"

  const formatCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`

  const availableTrucks = trucks.filter((t) => t.status === "available").length
  const inTransitLoads = recentLoads.filter((l) => l.status === "in_transit" || l.status === "dispatched").length

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* ─── STUDIO HERO HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f]">
              OPERATIONS DESK · LIVE FLEET ENGINE
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            {greeting}, <span className="italic text-[#d9622b]">{firstName}</span>.
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            Commercial freight dispatch, active highway runs, and fleet readiness overview.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <RecordExpenseDialog
            drivers={drivers}
          />

          {canCreateLoad && (
            <Link
              href="/loads/new"
              className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-hover transition-colors shadow-xs"
            >
              <Plus className="size-3.5" />
              New Load
            </Link>
          )}
        </div>
      </div>

      {/* ─── KOKONUT-STYLE KPI COCKPIT HUD ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Active Loads */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Active Freight Loads
            </span>
            <div className="size-7 rounded-lg bg-[#fff0e6] dark:bg-orange-950/40 flex items-center justify-center text-[#d9622b]">
              <Truck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#16181d] dark:text-zinc-100">
              {activeLoads}
            </span>
            <span className="text-xs text-[#73757a]">booked or in-transit</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#73757a]">
            <span className="font-mono font-bold text-[#d9622b]">{inTransitLoads}</span>
            <span>rolling on highway</span>
          </div>
        </div>

        {/* Rolling Drivers */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Commercial Drivers
            </span>
            <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-emerald-600">
              {activeDrivers}
            </span>
            <span className="text-xs text-[#73757a]">of {drivers.length} drivers active</span>
          </div>
          <p className="mt-2 text-[11px] text-[#73757a]">CDL compliant & ready</p>
        </div>

        {/* Revenue MTD */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Billed Revenue MTD
            </span>
            <div className="size-7 rounded-lg bg-[#eee9df] dark:bg-zinc-800 flex items-center justify-center text-[#16181d] dark:text-zinc-200">
              <DollarSign className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#16181d] dark:text-zinc-100">
              {canViewRevenue ? formatCurrency(monthlyRevenue) : "Active"}
            </span>
            <span className="text-xs text-[#73757a]">AR billing volume</span>
          </div>
          <p className="mt-2 text-[11px] text-[#73757a]">Gross logistics revenue</p>
        </div>

        {/* Power Units Ready */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Tractor Availability
            </span>
            <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#16181d] dark:text-zinc-100">
              {availableTrucks}
            </span>
            <span className="text-xs text-[#73757a]">of {trucks.length} units ready</span>
          </div>
          <p className="mt-2 text-[11px] text-[#73757a]">Standby power in yard</p>
        </div>
      </div>

      {/* ─── MAIN COCKPIT: RECENT DISPATCHES + QUICK SHORTCUTS DOCK ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Freight Dispatches */}
        <Card className="lg:col-span-2 border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-2xl flex flex-col justify-between">
          <div>
            <div className="border-b border-[#e4ddd3] dark:border-zinc-800 p-5 flex items-center justify-between bg-[#f7f3ec]/80 dark:bg-zinc-900/40">
              <div>
                <h2 className="font-serif text-xl font-normal text-[#16181d] dark:text-zinc-100">
                  Recent <span className="italic text-[#d9622b]">Dispatches</span>
                </h2>
                <p className="text-xs mt-0.5 text-[#73757a]">
                  {recentLoads.length} total shipments · {activeLoads} actively dispatched
                </p>
              </div>
              <Link
                href="/loads"
                className="h-8 px-3.5 inline-flex items-center justify-center rounded-full bg-brand-ink hover:bg-brand-ink-hover text-brand-cream text-xs font-medium transition-colors shadow-2xs"
              >
                View all loads
                <ArrowUpRight className="size-3 ml-1" />
              </Link>
            </div>

            {recentLoads.length === 0 ? (
              <EmptyActiveLoads />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/40 dark:bg-zinc-900/20">
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Load #
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Customer Shipper
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Route Lane
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Status
                      </th>
                      <th className="text-right font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Rate (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                    {recentLoads.slice(0, 8).map((ld: any) => (
                      <tr
                        key={ld.id}
                        className="hover:bg-[#f7f3ec]/50 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#16181d] dark:text-zinc-100">
                          <Link
                            href={`/loads/${ld.id}`}
                            className="hover:text-[#d9622b] hover:underline inline-flex items-center gap-1"
                          >
                            {ld.loadNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#16181d] dark:text-zinc-200">
                          {ld.customerName || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#73757a]">
                          {ld.originCity && ld.destCity ? (
                            <span>
                              {ld.originCity}, {ld.originState}{" "}
                              <span className="text-[#8a8b8f]">→</span> {ld.destCity},{" "}
                              {ld.destState}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={ld.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                          {ld.rate ? `$${parseFloat(ld.rate).toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Operations & Dispatch Dock */}
        <div className="space-y-4">
          <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-5 shadow-xs rounded-2xl">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-wider mb-3 text-[#8a8b8f]">
              Dispatch & Terminal Shortcuts
            </h3>
            <div className="space-y-1.5">
              {canCreateLoad && (
                <QuickAction
                  href="/loads/new"
                  icon={Plus}
                  label="Create New Load"
                  hint="Paced 5-stop onboarding flow"
                />
              )}
              {canViewTrips && (
                <QuickAction
                  href="/trips"
                  icon={Navigation}
                  label="Highway Trips"
                  hint="Live dispatches & route tracking"
                />
              )}
              {canCreateInvoice && (
                <QuickAction
                  href="/invoices"
                  icon={Receipt}
                  label="Invoicing & Billing"
                  hint="Commercial invoices & customer AR"
                />
              )}
              {canManageFleet && (
                <QuickAction
                  href="/fleet"
                  icon={Truck}
                  label="Fleet & Equipment"
                  hint="Tractors, trailers, and VIN registry"
                />
              )}
              {canInviteDrivers && (
                <QuickAction
                  href="/drivers"
                  icon={Users}
                  label="Driver Roster"
                  hint="CDL credentials & mobile app access"
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string
  icon: any
  label: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#f7f3ec] dark:hover:bg-zinc-900 transition-colors group border border-transparent hover:border-[#e4ddd3] dark:hover:border-zinc-800"
    >
      <div className="flex size-8 items-center justify-center rounded-lg bg-brand-ink text-brand-cream group-hover:bg-brand-ink-hover transition-colors shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#16181d] dark:text-zinc-100">{label}</p>
        <p className="text-[10px] text-[#73757a] truncate">{hint}</p>
      </div>
      <ArrowUpRight className="size-3.5 text-[#8a8b8f] group-hover:text-[#16181d] dark:group-hover:text-zinc-100 transition-colors" />
    </Link>
  )
}

function EmptyActiveLoads() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto size-12 rounded-full bg-[#fff0e6] dark:bg-orange-950/40 text-[#d9622b] flex items-center justify-center mb-4">
        <Truck className="size-5" />
      </div>
      <p className="text-sm font-semibold text-[#16181d] dark:text-zinc-100">No shipments registered yet</p>
      <p className="text-xs mt-1 max-w-xs mx-auto text-[#73757a]">
        Book your first load using the streamlined 5-step creation studio to begin dispatching.
      </p>
      <Link
        href="/loads/new"
        className="mt-4 h-9 px-4 inline-flex items-center justify-center rounded-full bg-brand-ink hover:bg-brand-ink-hover text-brand-cream text-xs font-medium transition-colors shadow-2xs"
      >
        <Plus className="size-3.5 mr-1.5" />
        Create your first load
      </Link>
    </div>
  )
}
