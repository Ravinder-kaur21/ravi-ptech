"use client"

import * as React from "react"
import Link from "next/link"
import {
  TrendingUp,
  DollarSign,
  Truck,
  ArrowUpRight,
  PieChart,
  MapPin,
  Percent,
  Search,
  Fuel,
  Receipt,
  User,
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

interface ReportsDashboardViewProps {
  loadProfits: LoadProfitRecord[]
  topLanes: LaneRecord[]
  totalRevenue: number
  totalExpenses: number
  totalNetProfit: number
  overallMargin: number
}

export function ReportsDashboardView({
  loadProfits,
  topLanes,
  totalRevenue,
  totalExpenses,
  totalNetProfit,
  overallMargin,
}: ReportsDashboardViewProps) {
  const [activeTab, setActiveTab] = React.useState<"profitability" | "lanes">("profitability")
  const [searchQuery, setSearchQuery] = React.useState("")

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

  return (
    <div className="space-y-4">
      {/* ─── TABS & CONTROLS ─── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "profitability" | "lanes")}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 p-0.5 h-8.5 rounded-lg w-full sm:w-auto">
            <TabsTrigger
              value="profitability"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              <DollarSign className="size-3.5" />
              Load Profitability & Margins
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {loadProfits.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="lanes"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              <MapPin className="size-3.5" />
              Top Freight Corridors
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {topLanes.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "profitability" && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search load, shipper, city..."
                className="h-8.5 pl-8.5 text-xs bg-[#fdfbf7] dark:bg-zinc-950 border-[#e4ddd3] dark:border-zinc-800 rounded-lg placeholder:text-[#8a8b8f]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8a8b8f] hover:text-[#16181d] dark:hover:text-zinc-100"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── LOAD PROFITABILITY TAB ─── */}
        <TabsContent value="profitability" className="mt-0">
          <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
            <Table>
              <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
                <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Load #
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Customer / Shipper
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Freight Lane
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Gross Revenue
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Direct Costs
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Net Margin ($)
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Margin %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                {filteredLoads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-[#8a8b8f]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <TrendingUp className="size-5 text-[#8a8b8f]/60" />
                        <p className="font-medium text-[#16181d] dark:text-zinc-200">
                          No loads available for profitability analysis
                        </p>
                        <p className="text-[11px] text-[#8a8b8f]">
                          Book and dispatch loads with attached revenue rates to view margin statements
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoads.map((l) => (
                    <TableRow
                      key={l.id}
                      className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                    >
                      {/* Load # */}
                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                        <Link
                          href={`/loads/${l.id}`}
                          className="text-[#d9622b] hover:underline inline-flex items-center gap-1"
                        >
                          {l.loadNumber}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </TableCell>

                      {/* Customer / Shipper */}
                      <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-100">
                        <span className="font-medium">{l.customerName || "—"}</span>
                      </TableCell>

                      {/* Freight Lane */}
                      <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-200">
                        {l.originCity && l.destCity ? (
                          <span className="truncate max-w-[220px] inline-block font-mono text-[11px]">
                            {l.originCity}, {l.originState} → {l.destCity}, {l.destState}
                          </span>
                        ) : (
                          <span className="text-[#8a8b8f]">—</span>
                        )}
                      </TableCell>

                      {/* Gross Revenue */}
                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                        ${l.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Direct Costs */}
                      <TableCell className="px-4 py-3 text-right font-mono text-xs text-[#8a8b8f]">
                        ${l.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Net Margin ($) */}
                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        ${l.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Margin % */}
                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold">
                        <Badge
                          variant="outline"
                          className={
                            l.marginPercent >= 20
                              ? "bg-emerald-50 text-emerald-700 border-emerald-500/20 text-[10px] font-mono"
                              : l.marginPercent >= 10
                              ? "bg-blue-50 text-blue-700 border-blue-500/20 text-[10px] font-mono"
                              : "bg-amber-50 text-amber-700 border-amber-500/20 text-[10px] font-mono"
                          }
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

        {/* ─── TOP LANES TAB ─── */}
        <TabsContent value="lanes" className="mt-0">
          <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
            <Table>
              <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
                <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Freight Corridor
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Shipment Volume
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Total Revenue
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Average Rate / Load
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                {topLanes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-xs text-[#8a8b8f]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <MapPin className="size-5 text-[#8a8b8f]/60" />
                        <p className="font-medium text-[#16181d] dark:text-zinc-200">
                          No corridor data available yet
                        </p>
                        <p className="text-[11px] text-[#8a8b8f]">
                          Dispatched loads with origin and destination states will automatically aggregate into corridors here
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  topLanes.map((lane) => (
                    <TableRow
                      key={lane.corridor}
                      className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                    >
                      <TableCell className="px-4 py-3 font-mono font-bold text-xs text-[#16181d] dark:text-zinc-100">
                        {lane.corridor}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <Badge variant="outline" className="text-[10px] font-mono border-[#e4ddd3]">
                          {lane.loadCount} {lane.loadCount === 1 ? "run" : "runs"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                        ${lane.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-bold text-[#d9622b]">
                        ${lane.averageRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
