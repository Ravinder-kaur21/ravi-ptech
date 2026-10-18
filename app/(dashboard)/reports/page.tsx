import { redirect } from "next/navigation"
import {
  TrendingUp,
  DollarSign,
  Percent,
  Receipt,
  Truck,
  MapPin,
} from "lucide-react"
import {
  getSession,
  getLoadsForOrg,
  getExpensesWithDetailsForOrg,
  getCarrierPaymentsWithDetailsForOrg,
} from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import {
  ReportsDashboardView,
  type LoadProfitRecord,
  type LaneRecord,
} from "@/components/tms/reports-dashboard-view"

export const instant = false

export default async function ReportsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (
    !perms.has("reports.module") &&
    !perms.has("accounting.module") &&
    !perms.has("loads.module")
  ) {
    redirect("/")
  }

  const [loads, expenses, carrierPayments] = await Promise.all([
    getLoadsForOrg(tenantId),
    getExpensesWithDetailsForOrg(tenantId),
    getCarrierPaymentsWithDetailsForOrg(tenantId),
  ])

  // Map expenses by loadNumber
  const expensesByLoad = new Map<string, number>()
  let totalApExpenses = 0
  for (const exp of expenses) {
    const amt = parseFloat(exp.amount || "0")
    totalApExpenses += amt
    if (exp.loadNumber) {
      expensesByLoad.set(exp.loadNumber, (expensesByLoad.get(exp.loadNumber) || 0) + amt)
    }
  }

  // Map carrier payments by loadId
  const carrierCostByLoad = new Map<string, number>()
  let totalCarrierCost = 0
  for (const cp of carrierPayments) {
    const amt = parseFloat(cp.netAmount || cp.amount || "0")
    totalCarrierCost += amt
    if (cp.loadId) {
      carrierCostByLoad.set(cp.loadId, (carrierCostByLoad.get(cp.loadId) || 0) + amt)
    }
  }

  // Compute per-load profitability
  let totalRevenue = 0
  const loadProfits: LoadProfitRecord[] = []
  const laneMap = new Map<string, { count: number; revenue: number }>()

  for (const l of loads) {
    const rev = parseFloat(l.finalRate || l.rate || "0")
    totalRevenue += rev

    const directExp = expensesByLoad.get(l.loadNumber) || 0
    const carrierCost = carrierCostByLoad.get(l.id) || 0
    const totalCost = directExp + carrierCost
    const netProfit = rev - totalCost
    const marginPercent = rev > 0 ? (netProfit / rev) * 100 : 0

    loadProfits.push({
      id: l.id,
      loadNumber: l.loadNumber,
      customerName: l.customerName,
      originCity: l.originCity,
      originState: l.originState,
      destCity: l.destCity,
      destState: l.destState,
      status: l.status,
      revenue: rev,
      directExpenses: directExp,
      carrierCost,
      totalCost,
      netProfit,
      marginPercent,
    })

    // Corridor aggregation
    if (l.originState && l.destState) {
      const corridor = `${l.originState} → ${l.destState}`
      const existing = laneMap.get(corridor) || { count: 0, revenue: 0 }
      laneMap.set(corridor, {
        count: existing.count + 1,
        revenue: existing.revenue + rev,
      })
    }
  }

  // Top Lanes list sorted by revenue
  const topLanes: LaneRecord[] = Array.from(laneMap.entries())
    .map(([corridor, data]) => ({
      corridor,
      loadCount: data.count,
      totalRevenue: data.revenue,
      averageRate: data.count > 0 ? data.revenue / data.count : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  const totalCosts = totalApExpenses + totalCarrierCost
  const totalNetProfit = totalRevenue - totalCosts
  const overallMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
          Fleet & Freight <span className="italic text-[#d9622b]">Analytics</span>
        </h1>
        <p className="mt-1 text-sm text-[#73757a]">
          Comprehensive load margins, operational cost accounting, and high-volume freight corridors.
        </p>
      </div>

      {/* ─── KPI METRICS COCKPIT (Dashboard Design Language) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <DollarSign className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Gross Freight Revenue</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {loads.length} total shipments booked
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Receipt className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            ${totalCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Direct Operating Costs</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Carrier settlements & AP trip receipts
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <TrendingUp className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            ${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Net Fleet Profit</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Realized bottom-line margin
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Percent className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {overallMargin.toFixed(1)}%
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Operating Margin %</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Fleet margin across all active runs
          </p>
        </Card>
      </div>

      {/* ─── LIVE REPORTS DASHBOARD VIEW ─── */}
      <ReportsDashboardView
        loadProfits={loadProfits}
        topLanes={topLanes}
        totalRevenue={totalRevenue}
        totalExpenses={totalCosts}
        totalNetProfit={totalNetProfit}
        overallMargin={overallMargin}
      />
    </div>
  )
}
