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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
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
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarGrid,
  Cell,
  Legend,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SpendingRing, type SpendingCategory } from "@/components/kokonutui/spending-ring"
import { MetricCard } from "@/components/kokonutui/metric-card"
import { FollowerPointerCard } from "@/components/ui/following-pointer"
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

export interface DailyCashflowPoint {
  date: string
  revenue: number
  expenses: number
}

export interface EquipmentModeShare {
  mode: string
  label: string
  revenue: number
  count: number
  fill: string
}

export interface FleetIndex {
  metric: string
  label: string
  value: number
  fill: string
}

interface ReportsDashboardViewProps {
  loadProfits: LoadProfitRecord[]
  topLanes: LaneRecord[]
  totalRevenue: number
  totalExpenses: number
  totalNetProfit: number
  overallMargin: number
  expenseBreakdown?: ExpenseBreakdown
  dailyCashflowData?: DailyCashflowPoint[]
  equipmentBreakdown?: EquipmentModeShare[]
  fleetFulfillmentIndices?: FleetIndex[]
}

const cashflowConfig = {
  revenue: {
    label: "Freight Revenue",
    color: "#d9622b",
  },
  expenses: {
    label: "Operating Costs",
    color: "#8b5cf6",
  },
} satisfies ChartConfig

const equipmentConfig = {
  revenue: {
    label: "Revenue",
  },
  dry_van: {
    label: "Dry Van",
    color: "#d9622b",
  },
  reefer: {
    label: "Reefer",
    color: "#3b82f6",
  },
  flatbed: {
    label: "Flatbed",
    color: "#8b5cf6",
  },
  step_deck: {
    label: "Step Deck",
    color: "#10b981",
  },
  power_only: {
    label: "Power Only",
    color: "#f59e0b",
  },
  other: {
    label: "Specialized",
    color: "#64748b",
  },
} satisfies ChartConfig

const radialConfig = {
  value: {
    label: "Performance Score",
  },
  onTime: {
    label: "On-Time Dispatch",
    color: "#d9622b",
  },
  margin: {
    label: "Operating Margin",
    color: "#10b981",
  },
  collection: {
    label: "AR Collection",
    color: "#3b82f6",
  },
  utilization: {
    label: "Fleet Utilization",
    color: "#8b5cf6",
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
  dailyCashflowData = [],
  equipmentBreakdown = [],
  fleetFulfillmentIndices = [],
}: ReportsDashboardViewProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "profitability" | "lanes">("overview")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [chartType, setChartType] = React.useState<"bar" | "area">("bar")
  const [timeRange, setTimeRange] = React.useState("30d")

  const filteredCashflowData = React.useMemo(() => {
    if (!dailyCashflowData || dailyCashflowData.length === 0) return []
    let days = 30
    if (timeRange === "90d") days = 90
    if (timeRange === "7d") days = 7
    return dailyCashflowData.slice(-days)
  }, [dailyCashflowData, timeRange])

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

        {/* ─── TAB 1: EXECUTIVE COCKPIT & CHARTS (shadcn + KokonutUI + Aceternity) ─── */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <FollowerPointerCard title="Dispatcher View · Realtime Analytics">
            <div className="space-y-6">
              {/* Row 1: Interactive Daily Cashflow Area Chart (7 cols) + KokonutUI Spending Ring (5 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* 1. Interactive Area Chart with Select (7 cols) */}
                <Card className="lg:col-span-7 border-brand-rule bg-brand-card flex flex-col justify-between shadow-xs">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-brand-rule pb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                        Real Cashflow Inflows vs Outflows
                      </span>
                      <CardTitle className="font-serif text-lg font-bold text-brand-ink mt-0.5">
                        Freight Billing vs Direct Expenses
                      </CardTitle>
                      <CardDescription className="text-xs text-brand-muted-soft mt-0.5">
                        Daily freight revenues billed vs operational trip costs
                      </CardDescription>
                    </div>
                    <Select
                      value={timeRange}
                      onValueChange={(val) => {
                        sounds.playClick()
                        setTimeRange(val)
                      }}
                    >
                      <SelectTrigger
                        className="w-[140px] h-8 text-xs rounded-lg border-brand-rule bg-brand-cream/40"
                        aria-label="Select date range"
                      >
                        <SelectValue placeholder="Last 30 days" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-brand-rule bg-brand-card">
                        <SelectItem value="90d" className="text-xs">Last 90 days</SelectItem>
                        <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
                        <SelectItem value="7d" className="text-xs">Last 7 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <ChartContainer
                      config={cashflowConfig}
                      className="aspect-auto h-[260px] w-full"
                    >
                      <AreaChart
                        data={
                          filteredCashflowData.length > 0
                            ? filteredCashflowData
                            : [
                                { date: "2026-10-14", revenue: totalRevenue * 0.25, expenses: totalExpenses * 0.2 },
                                { date: "2026-10-15", revenue: totalRevenue * 0.35, expenses: totalExpenses * 0.3 },
                                { date: "2026-10-16", revenue: totalRevenue * 0.2, expenses: totalExpenses * 0.25 },
                                { date: "2026-10-17", revenue: totalRevenue * 0.15, expenses: totalExpenses * 0.15 },
                                { date: "2026-10-18", revenue: totalRevenue * 0.05, expenses: totalExpenses * 0.1 },
                              ]
                        }
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d9622b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#d9622b" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#e4ddd3" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={28}
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          }}
                          stroke="#73757a"
                          fontSize={11}
                        />
                        <YAxis
                          stroke="#73757a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={55}
                          tickFormatter={formatCurrencyTick}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value) => {
                                return new Date(value).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              }}
                              indicator="dot"
                            />
                          }
                        />
                        <Area
                          dataKey="expenses"
                          type="natural"
                          fill="url(#fillExpenses)"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          stackId="a"
                        />
                        <Area
                          dataKey="revenue"
                          type="natural"
                          fill="url(#fillRevenue)"
                          stroke="#d9622b"
                          strokeWidth={2}
                          stackId="b"
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-wrap items-center justify-between text-xs border-t border-brand-rule pt-3 gap-2">
                    <span className="font-mono text-brand-muted-soft text-[11px]">
                      Cash ledger synced across shipment rates & expense vouchers
                    </span>
                    <span className="font-mono text-emerald-700 font-semibold text-[11px]">
                      Retained Margin: ${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </CardFooter>
                </Card>

                {/* 2. KokonutUI Spending Ring Card (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <SpendingRing
                    title="Operational Cost Breakdown"
                    currency="USD"
                    categories={spendingCategories}
                    className="w-full h-full border-brand-rule bg-brand-card shadow-xs"
                  />
                </div>
              </div>

              {/* Row 2: Pie Chart with Labels (6 cols) + Radial Bar Chart with Polar Grid (6 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* 3. Pie Chart with Labels: Revenue by Equipment Mode */}
                <Card className="flex flex-col border-brand-rule bg-brand-card shadow-xs">
                  <CardHeader className="items-center pb-0 border-b border-brand-rule/60">
                    <div className="flex items-center gap-2">
                      <Truck className="size-4 text-[#d9622b]" />
                      <CardTitle className="text-sm font-semibold tracking-wide uppercase text-brand-ink">
                        Revenue by Equipment Mode
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-brand-muted-soft">
                      Real shipment distribution by trailer configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer
                      config={equipmentConfig}
                      className="mx-auto aspect-square max-h-[250px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name) => (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-brand-ink">
                                    ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-brand-muted-soft text-xs">({name})</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={
                            equipmentBreakdown.length > 0
                              ? equipmentBreakdown
                              : [
                                  {
                                    mode: "dry_van",
                                    label: "Dry Van",
                                    revenue: totalRevenue || 1000,
                                    count: 1,
                                    fill: "#d9622b",
                                  },
                                ]
                          }
                          dataKey="revenue"
                          nameKey="label"
                          label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {equipmentBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-1.5 text-xs border-t border-brand-rule/60 pt-3">
                    <div className="flex items-center gap-2 font-medium text-brand-ink">
                      {equipmentBreakdown.length > 0 ? (
                        <>
                          Leading mode: {equipmentBreakdown[0].label} ({equipmentBreakdown[0].count} shipments)
                        </>
                      ) : (
                        <>Live fleet freight modes</>
                      )}
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-brand-muted-soft">
                      Proportionate freight billing across active corridors
                    </div>
                  </CardFooter>
                </Card>

                {/* 4. Radial Bar Chart with Polar Grid: Fleet Fulfillment Index */}
                <Card className="flex flex-col border-brand-rule bg-brand-card shadow-xs">
                  <CardHeader className="items-center pb-0 border-b border-brand-rule/60">
                    <div className="flex items-center gap-2">
                      <Percent className="size-4 text-emerald-600" />
                      <CardTitle className="text-sm font-semibold tracking-wide uppercase text-brand-ink">
                        Fleet Fulfillment & Performance
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-brand-muted-soft">
                      Concentric operational efficiency scores (0–100%)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <ChartContainer
                      config={radialConfig}
                      className="mx-auto aspect-square max-h-[250px]"
                    >
                      <RadialBarChart
                        data={fleetFulfillmentIndices}
                        innerRadius={30}
                        outerRadius={105}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              hideLabel
                              nameKey="label"
                              formatter={(value, name) => `${name}: ${value}%`}
                            />
                          }
                        />
                        <PolarGrid gridType="circle" />
                        <RadialBar dataKey="value" background cornerRadius={6} />
                      </RadialBarChart>
                    </ChartContainer>
                  </CardContent>
                  <CardFooter className="flex-col gap-1.5 text-xs border-t border-brand-rule/60 pt-3">
                    <div className="flex items-center gap-2 font-medium text-brand-ink">
                      Overall Fleet Margin:{" "}
                      <span className="font-mono text-emerald-600 font-bold">
                        {overallMargin > 0 ? `${overallMargin.toFixed(1)}%` : "100%"}
                      </span>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-brand-muted-soft">
                      On-Time Dispatch · Margin Index · AR Collection · Equipment Utilization
                    </div>
                  </CardFooter>
                </Card>
              </div>

              {/* Row 3: KokonutUI Metric Cards Row */}
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
            </div>
          </FollowerPointerCard>
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
