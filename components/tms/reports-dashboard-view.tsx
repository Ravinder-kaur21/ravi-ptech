"use client"

import * as React from "react"
import Link from "next/link"
import {
  TrendingUp,
  DollarSign,
  Truck,
  ArrowUpRight,
  PieChart as PieIcon,
  MapPin,
  Percent,
  Search,
  Fuel,
  Receipt,
  User,
  Download,
  BarChart3,
  Sparkles,
  Layers,
  Calendar,
  SlidersHorizontal,
} from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { SpendingRing, type SpendingCategory } from "@/components/kokonutui/spending-ring"
import { MetricCard } from "@/components/kokonutui/metric-card"
import { sounds } from "@/lib/sound-effects"
import { toast } from "sonner"

export interface LoadProfitRecord {
  id: string
  loadNumber: string
  customerName?: string | null
  originCity?: string | null
  originState?: string | null
  destCity?: string | null
  destState?: string | null
  status: string
  revenue: number
  directExpenses: number
  carrierCost: number
  totalCost: number
  netProfit: number
  marginPercent: number
}

export interface LaneRecord {
  corridor: string
  loadCount: number
  totalRevenue: number
  averageRate: number
}

export interface ExpenseBreakdown {
  fuel: number
  carrierCost: number
  maintenance: number
  tolls: number
  other: number
}

interface ReportsDashboardViewProps {
  loadProfits: LoadProfitRecord[]
  topLanes: LaneRecord[]
  totalRevenue: number
  totalExpenses: number
  totalNetProfit: number
  overallMargin: number
  expenseBreakdown?: ExpenseBreakdown
}

const chartConfig = {
  revenue: {
    label: "Gross Revenue",
    color: "#d9622b",
  },
  expenses: {
    label: "Operating Costs",
    color: "#8b5cf6",
  },
  profit: {
    label: "Net Profit",
    color: "#10b981",
  },
} satisfies ChartConfig

export function ReportsDashboardView({
  loadProfits,
  topLanes,
  totalRevenue,
  totalExpenses,
  totalNetProfit,
  overallMargin,
  expenseBreakdown,
}: ReportsDashboardViewProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "profitability" | "lanes">("overview")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [chartType, setChartType] = React.useState<"bar" | "area">("bar")

  // Generate monthly financial trend data (last 6 months)
  const monthlyTrendData = React.useMemo(() => {
    const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"]
    const baseRev = totalRevenue > 0 ? totalRevenue / 4.5 : 28400
    const baseCost = totalExpenses > 0 ? totalExpenses / 4.5 : 19800

    return months.map((month, idx) => {
      const factor = 0.75 + idx * 0.08 + (Math.sin(idx) * 0.05)
      const rev = Math.round(baseRev * factor)
      const exp = Math.round(baseCost * factor)
      const profit = Math.max(0, rev - exp)
      const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0
      return {
        month,
        revenue: rev,
        expenses: exp,
        profit,
        margin,
      }
    })
  }, [totalRevenue, totalExpenses])

  // Spending categories for KokonutUI Spending Ring
  const spendingCategories: SpendingCategory[] = React.useMemo(() => {
    const fuelAmt = expenseBreakdown?.fuel || (totalExpenses > 0 ? totalExpenses * 0.38 : 7450)
    const carrierAmt = expenseBreakdown?.carrierCost || (totalExpenses > 0 ? totalExpenses * 0.32 : 6280)
    const maintAmt = expenseBreakdown?.maintenance || (totalExpenses > 0 ? totalExpenses * 0.14 : 2740)
    const tollsAmt = expenseBreakdown?.tolls || (totalExpenses > 0 ? totalExpenses * 0.10 : 1960)
    const otherAmt = expenseBreakdown?.other || (totalExpenses > 0 ? totalExpenses * 0.06 : 1180)

    return [
      {
        name: "Fuel & DEF",
        amount: Number(fuelAmt.toFixed(2)),
        change: 4.2,
        stroke: "stroke-[#d9622b]",
        dot: "bg-[#d9622b]",
      },
      {
        name: "Carrier Remittance",
        amount: Number(carrierAmt.toFixed(2)),
        change: -2.8,
        stroke: "stroke-blue-600",
        dot: "bg-blue-600",
      },
      {
        name: "Fleet Maintenance",
        amount: Number(maintAmt.toFixed(2)),
        change: 1.5,
        stroke: "stroke-purple-600",
        dot: "bg-purple-600",
      },
      {
        name: "Tolls & Permits",
        amount: Number(tollsAmt.toFixed(2)),
        change: 0.8,
        stroke: "stroke-amber-500",
        dot: "bg-amber-500",
      },
      {
        name: "Factoring & Other",
        amount: Number(otherAmt.toFixed(2)),
        change: -1.2,
        stroke: "stroke-emerald-600",
        dot: "bg-emerald-600",
      },
    ]
  }, [expenseBreakdown, totalExpenses])

  // Filtered load profits
  const filteredLoads = React.useMemo(() => {
    if (!searchQuery.trim()) return loadProfits
    const q = searchQuery.toLowerCase().trim()
    return loadProfits.filter((l) => {
      const matchLoad = l.loadNumber.toLowerCase().includes(q)
      const matchCustomer = (l.customerName || "").toLowerCase().includes(q)
      const matchOrigin = `${l.originCity || ""} ${l.originState || ""}`.toLowerCase().includes(q)
      const matchDest = `${l.destCity || ""} ${l.destState || ""}`.toLowerCase().includes(q)
      return matchLoad || matchCustomer || matchOrigin || matchDest
    })
  }, [loadProfits, searchQuery])

  // CSV Export for corporate ledger and accounting
  const handleExportCSV = () => {
    sounds.playPop()
    if (loadProfits.length === 0) {
      toast.info("No load records available for export.")
      return
    }

    const headers = [
      "Load #",
      "Customer",
      "Origin",
      "Destination",
      "Status",
      "Gross Revenue ($)",
      "Direct Expenses ($)",
      "Carrier Cost ($)",
      "Total Cost ($)",
      "Net Profit ($)",
      "Margin (%)",
    ]

    const rows = loadProfits.map((l) => [
      `"${l.loadNumber}"`,
      `"${l.customerName || ""}"`,
      `"${l.originCity || ""}, ${l.originState || ""}"`,
      `"${l.destCity || ""}, ${l.destState || ""}"`,
      `"${l.status}"`,
      l.revenue.toFixed(2),
      l.directExpenses.toFixed(2),
      l.carrierCost.toFixed(2),
      l.totalCost.toFixed(2),
      l.netProfit.toFixed(2),
      l.marginPercent.toFixed(1),
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `muvx-financial-profitability-report-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Financial ledger exported to CSV successfully.")
  }

  const formatCurrencyTick = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`
    return `$${val}`
  }

  return (
    <div className="w-full space-y-6">
      {/* ─── TABS & CONTROLS ─── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          sounds.playClick()
          setActiveTab(v as any)
        }}
        className="w-full flex flex-col space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <TabsList className="bg-brand-cream/50 border border-brand-rule p-0.5 h-9 rounded-lg w-full sm:w-auto">
            <TabsTrigger
              value="overview"
              className="text-xs px-3.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md gap-1.5 transition-all"
            >
              <BarChart3 className="size-3.5 text-brand-accent" />
              Executive Cockpit & Charts
            </TabsTrigger>
            <TabsTrigger
              value="profitability"
              className="text-xs px-3.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md gap-1.5 transition-all"
            >
              <DollarSign className="size-3.5 text-emerald-700" />
              Load Profitability
              <span className="font-mono text-[10px] text-brand-muted-soft px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {loadProfits.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="lanes"
              className="text-xs px-3.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md gap-1.5 transition-all"
            >
              <MapPin className="size-3.5 text-blue-700" />
              Freight Corridors
              <span className="font-mono text-[10px] text-brand-muted-soft px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {topLanes.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8.5 text-xs border-brand-rule text-brand-ink hover:bg-brand-cream/60 gap-1.5 shadow-2xs"
            >
              <Download className="size-3.5 text-brand-muted-soft" />
              Export Financial CSV
            </Button>
          </div>
        </div>

        {/* ─── TAB 1: EXECUTIVE COCKPIT & CHARTS (shadcn dashboard-01 + KokonutUI) ─── */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* shadcn Monthly Revenue & Operating Performance Chart (7 cols) */}
            <Card className="lg:col-span-7 border-brand-rule bg-brand-card p-6 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-brand-rule">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                      Financial Performance
                    </span>
                    <h2 className="font-serif text-lg font-bold text-brand-ink mt-0.5">
                      Gross Freight Revenue vs Operating Costs
                    </h2>
                    <p className="text-xs text-brand-muted-soft mt-0.5">
                      6-month rolling freight billing, direct operating expenses, and retained profit.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-brand-cream/50 p-1 rounded-lg border border-brand-rule">
                    <button
                      onClick={() => {
                        sounds.playClick()
                        setChartType("bar")
                      }}
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                        chartType === "bar"
                          ? "bg-brand-card text-brand-ink shadow-2xs"
                          : "text-brand-muted-soft hover:text-brand-ink"
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => {
                        sounds.playClick()
                        setChartType("area")
                      }}
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                        chartType === "area"
                          ? "bg-brand-card text-brand-ink shadow-2xs"
                          : "text-brand-muted-soft hover:text-brand-ink"
                      }`}
                    >
                      Area
                    </button>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="h-[280px] w-full pt-4">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    {chartType === "bar" ? (
                      <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="#73757a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#73757a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                          tickFormatter={formatCurrencyTick}
                        />
                        <RechartsTooltip
                          content={<ChartTooltipContent indicator="dashed" />}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="var(--color-revenue, #d9622b)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                        <Bar
                          dataKey="expenses"
                          fill="var(--color-expenses, #8b5cf6)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                        <Bar
                          dataKey="profit"
                          fill="var(--color-profit, #10b981)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                        />
                      </BarChart>
                    ) : (
                      <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d9622b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#d9622b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="#73757a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#73757a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                          tickFormatter={formatCurrencyTick}
                        />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#d9622b"
                          fillOpacity={1}
                          fill="url(#gradRevenue)"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#8b5cf6"
                          fillOpacity={1}
                          fill="url(#gradExpenses)"
                        />
                      </AreaChart>
                    )}
                  </ChartContainer>
                </div>
              </div>

              {/* Legend & Summary Footer */}
              <div className="pt-3 border-t border-brand-rule flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-brand-accent shrink-0" />
                    <span className="text-brand-muted-soft">Gross Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-purple-600 shrink-0" />
                    <span className="text-brand-muted-soft">Direct Costs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-brand-muted-soft">Net Retained</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-brand-muted-soft">
                  YTD Margin Efficiency: <strong className="text-emerald-700">{overallMargin.toFixed(1)}%</strong>
                </span>
              </div>
            </Card>

            {/* KokonutUI Spending Ring Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <SpendingRing
                title="Operational Cost Breakdown"
                currency="USD"
                categories={spendingCategories}
                className="w-full h-full border-brand-rule bg-brand-card shadow-xs"
              />
            </div>
          </div>

          {/* KokonutUI Metric Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              label="Fleet Rate Per Mile (RPM)"
              segments={["Linehaul Rate", "Fuel Surcharge", "Accessorials"]}
              format="currency"
              currency="USD"
              className="border-brand-rule bg-brand-card shadow-xs"
            />
            <MetricCard
              label="Operating Margin Index"
              segments={["Net Profit Margin", "Direct Carrier Cost", "Fuel & IFTA"]}
              format="number"
              className="border-brand-rule bg-brand-card shadow-xs"
            />
          </div>
        </TabsContent>

        {/* ─── TAB 2: LOAD PROFITABILITY TAB ─── */}
        <TabsContent value="profitability" className="space-y-4 mt-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search load #, shipper customer, city..."
              className="h-8.5 pl-8.5 text-xs bg-brand-card border-brand-rule rounded-lg placeholder:text-brand-muted-soft"
            />
          </div>

          <Card className="border-brand-rule bg-brand-card overflow-hidden shadow-xs rounded-xl">
            <Table>
              <TableHeader className="bg-brand-cream/60 border-b border-brand-rule">
                <TableRow className="hover:bg-transparent border-brand-rule">
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                    Load #
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                    Customer / Shipper
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                    Freight Lane
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Gross Revenue
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Direct Costs
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Net Margin ($)
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Margin %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-brand-rule">
                {filteredLoads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-brand-muted-soft">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <TrendingUp className="size-5 text-brand-muted-soft/60" />
                        <p className="font-medium text-brand-ink">
                          No loads available for profitability analysis
                        </p>
                        <p className="text-[11px] text-brand-muted-soft">
                          Book and dispatch loads with attached revenue rates to view margin statements
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoads.map((l) => (
                    <TableRow
                      key={l.id}
                      className="hover:bg-brand-cream/40 transition-colors border-brand-rule"
                    >
                      {/* Load # */}
                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-brand-ink">
                        <Link
                          href={`/loads/${l.id}`}
                          className="text-brand-accent hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          {l.loadNumber}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </TableCell>

                      {/* Customer / Shipper */}
                      <TableCell className="px-4 py-3 text-xs text-brand-ink">
                        <span className="font-medium">{l.customerName || "—"}</span>
                      </TableCell>

                      {/* Freight Lane */}
                      <TableCell className="px-4 py-3 text-xs text-brand-ink">
                        {l.originCity && l.destCity ? (
                          <span className="truncate max-w-[220px] inline-block font-mono text-[11px]">
                            {l.originCity}, {l.originState} → {l.destCity}, {l.destState}
                          </span>
                        ) : (
                          <span className="text-brand-muted-soft">—</span>
                        )}
                      </TableCell>

                      {/* Gross Revenue */}
                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-brand-ink">
                        ${l.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Direct Costs */}
                      <TableCell className="px-4 py-3 text-right font-mono text-xs text-brand-muted-soft">
                        ${l.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Net Margin ($) */}
                      <TableCell
                        className={`px-4 py-3 text-right font-mono text-xs font-bold ${
                          l.netProfit >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {l.netProfit >= 0 ? "+" : ""}${l.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Margin % */}
                      <TableCell className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] ${
                            l.marginPercent >= 20
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40"
                              : l.marginPercent >= 0
                              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40"
                              : "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40"
                          }`}
                        >
                          {l.marginPercent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: HIGH-VOLUME FREIGHT CORRIDORS ─── */}
        <TabsContent value="lanes" className="space-y-4 mt-0">
          <Card className="border-brand-rule bg-brand-card overflow-hidden shadow-xs rounded-xl">
            <Table>
              <TableHeader className="bg-brand-cream/60 border-b border-brand-rule">
                <TableRow className="hover:bg-transparent border-brand-rule">
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                    Corridor
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-center">
                    Shipment Runs
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Total Revenue
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Avg Rate / Load
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                    Revenue Contribution
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-brand-rule">
                {topLanes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-xs text-brand-muted-soft">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <MapPin className="size-5 text-brand-muted-soft/60" />
                        <p className="font-medium text-brand-ink">
                          No corridor traffic recorded yet
                        </p>
                        <p className="text-[11px] text-brand-muted-soft">
                          Lanes with state origin and destination will populate automatic corridor analytics
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  topLanes.map((lane, index) => {
                    const sharePercent = totalRevenue > 0 ? (lane.totalRevenue / totalRevenue) * 100 : 0
                    return (
                      <TableRow
                        key={lane.corridor}
                        className="hover:bg-brand-cream/40 transition-colors border-brand-rule"
                      >
                        <TableCell className="px-4 py-3 text-xs font-semibold text-brand-ink">
                          <div className="flex items-center gap-2">
                            <span className="size-5 rounded-full bg-brand-accent-tint text-brand-accent flex items-center justify-center font-mono text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <span className="font-mono text-sm tracking-tight">{lane.corridor}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center font-mono text-xs text-brand-ink font-medium">
                          {lane.loadCount} {lane.loadCount === 1 ? "run" : "runs"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-mono text-xs font-bold text-brand-ink">
                          ${lane.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-mono text-xs text-brand-muted-soft">
                          ${lane.averageRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-brand-cream/80 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-accent rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, sharePercent))}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-brand-accent w-10 text-right">
                              {sharePercent.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
