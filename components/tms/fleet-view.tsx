"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import {
  Truck,
  Box,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Search,
  LayoutGrid,
  List,
  Copy,
  Check,
  Fuel,
  Gauge,
  Calendar,
  Wrench,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { AddTruckDialog } from "@/components/tms/add-truck-dialog"
import { AddTrailerDialog } from "@/components/tms/add-trailer-dialog"
import { cn } from "@/lib/utils"

export interface TruckItem {
  id: string
  unitNumber: string
  make?: string | null
  model?: string | null
  year?: string | null
  vin?: string | null
  licensePlate?: string | null
  licenseState?: string | null
  fuelType?: string | null
  currentLocation?: string | null
  currentMiles?: string | null
  status: "available" | "in_use" | "maintenance" | "out_of_service"
  notes?: string | null
}

export interface TrailerItem {
  id: string
  unitNumber: string
  type: string
  make?: string | null
  model?: string | null
  year?: string | null
  vin?: string | null
  licensePlate?: string | null
  licenseState?: string | null
  status: "available" | "in_use" | "maintenance" | "out_of_service"
  notes?: string | null
}

interface FleetViewProps {
  trucks: TruckItem[]
  trailers: TrailerItem[]
  canCreate?: boolean
}

export function FleetView({ trucks, trailers, canCreate }: FleetViewProps) {
  const [tab, setTab] = React.useState<"trucks" | "trailers">("trucks")
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid")
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopyVin = (vin: string, id: string) => {
    navigator.clipboard.writeText(vin)
    setCopiedId(id)
    toast.success("VIN copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filter trucks
  const filteredTrucks = React.useMemo(() => {
    return trucks.filter((t) => {
      const matchSearch =
        !search ||
        t.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        (t.make && t.make.toLowerCase().includes(search.toLowerCase())) ||
        (t.model && t.model.toLowerCase().includes(search.toLowerCase())) ||
        (t.vin && t.vin.toLowerCase().includes(search.toLowerCase())) ||
        (t.licensePlate && t.licensePlate.toLowerCase().includes(search.toLowerCase())) ||
        (t.currentLocation && t.currentLocation.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === "all" || t.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [trucks, search, statusFilter])

  // Filter trailers
  const filteredTrailers = React.useMemo(() => {
    return trailers.filter((tr) => {
      const matchSearch =
        !search ||
        tr.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        tr.type.toLowerCase().includes(search.toLowerCase()) ||
        (tr.make && tr.make.toLowerCase().includes(search.toLowerCase())) ||
        (tr.vin && tr.vin.toLowerCase().includes(search.toLowerCase())) ||
        (tr.licensePlate && tr.licensePlate.toLowerCase().includes(search.toLowerCase()))

      const matchStatus = statusFilter === "all" || tr.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [trailers, search, statusFilter])

  // Quick Stats
  const availableTrucks = trucks.filter((t) => t.status === "available").length
  const inUseTrucks = trucks.filter((t) => t.status === "in_use").length
  const maintTrucks = trucks.filter((t) => t.status === "maintenance" || t.status === "out_of_service").length

  const availableTrailers = trailers.filter((tr) => tr.status === "available").length
  const inUseTrailers = trailers.filter((tr) => tr.status === "in_use").length

  const totalAssets = trucks.length + trailers.length
  const totalActive = inUseTrucks + inUseTrailers
  const utilizationRate = totalAssets > 0 ? Math.round((totalActive / totalAssets) * 100) : 0

  return (
    <div className="space-y-6">
      {/* ─── HUD METRICS & FLEET READINESS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Assets & Utilization */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Total Fleet Assets
            </span>
            <div className="size-7 rounded-lg bg-[#eee9df] dark:bg-zinc-800 flex items-center justify-center text-[#16181d] dark:text-zinc-200">
              <Truck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#16181d] dark:text-zinc-100">
              {totalAssets}
            </span>
            <span className="text-xs text-[#73757a]">units ({trucks.length}P / {trailers.length}T)</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#73757a]">
            <span className="font-mono font-bold text-[#d9622b]">{utilizationRate}%</span>
            <span>fleet deployed on road</span>
          </div>
        </div>

        {/* Ready Power Units */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Ready Power Units
            </span>
            <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-emerald-600">
              {availableTrucks}
            </span>
            <span className="text-xs text-[#73757a]">of {trucks.length} tractors</span>
          </div>
          <p className="mt-2 text-[11px] text-[#73757a]">Unassigned & available in yard</p>
        </div>

        {/* Rolling on Run */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Rolling on Dispatches
            </span>
            <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
              <Truck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-blue-600">
              {inUseTrucks}
            </span>
            <span className="text-xs text-[#73757a]">active tractors</span>
          </div>
          <p className="mt-2 text-[11px] text-[#73757a]">Under active load dispatches</p>
        </div>

        {/* Available Trailers */}
        <div className="p-4 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] tracking-wider">
              Available Trailers
            </span>
            <div className="size-7 rounded-lg bg-[#fff0e6] dark:bg-orange-950/40 flex items-center justify-center text-[#d9622b]">
              <Box className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#16181d] dark:text-zinc-100">
              {availableTrailers}
            </span>
            <span className="text-xs text-[#73757a]">of {trailers.length} trailers</span>
          </div>
          <p className="mt-2 text-[11px] text-[#73757a]">Dry vans, reefers & flatbeds</p>
        </div>
      </div>

      {/* ─── CONTROLS: TABS, SEARCH, FILTERS & VIEW MODE ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Kokonut Segmented Pill Switcher (Tractors vs Trailers) */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#eee9df] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 self-start">
          <button
            type="button"
            onClick={() => setTab("trucks")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              tab === "trucks"
                ? "bg-white dark:bg-zinc-800 text-[#16181d] dark:text-zinc-100 shadow-xs"
                : "text-[#73757a] hover:text-[#16181d]"
            )}
          >
            <Truck className={cn("size-3.5", tab === "trucks" ? "text-[#d9622b]" : "text-[#8a8b8f]")} />
            <span>Tractors & Power Units ({trucks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("trailers")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              tab === "trailers"
                ? "bg-white dark:bg-zinc-800 text-[#16181d] dark:text-zinc-100 shadow-xs"
                : "text-[#73757a] hover:text-[#16181d]"
            )}
          >
            <Box className={cn("size-3.5", tab === "trailers" ? "text-[#d9622b]" : "text-[#8a8b8f]")} />
            <span>Trailers ({trailers.length})</span>
          </button>
        </div>

        {/* Search, Status Filter & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unit #, VIN, plate..."
              className="h-9 w-full rounded-full border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-8 pr-3 text-xs text-[#16181d] dark:text-zinc-100 placeholder:text-[#a8a29a] focus:border-[#d9622b] focus:outline-none transition-colors shadow-2xs"
            />
          </div>

          {/* Status Filter Pills */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-full border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none shadow-2xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="available">🟢 Available</option>
            <option value="in_use">🔵 Dispatched / In-Use</option>
            <option value="maintenance">🟠 Maintenance</option>
          </select>

          {/* Grid / Table Toggle */}
          <div className="flex items-center rounded-full border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
              className={cn(
                "p-1.5 rounded-full transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-[#eee9df] dark:bg-zinc-800 text-[#16181d] dark:text-zinc-100 shadow-2xs"
                  : "text-[#8a8b8f] hover:text-[#16181d]"
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Data Table View"
              className={cn(
                "p-1.5 rounded-full transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-[#eee9df] dark:bg-zinc-800 text-[#16181d] dark:text-zinc-100 shadow-2xs"
                  : "text-[#8a8b8f] hover:text-[#16181d]"
              )}
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── TRACTORS CONTENT ─── */}
      {tab === "trucks" && (
        <>
          {filteredTrucks.length === 0 ? (
            <div className="rounded-3xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-12 text-center shadow-xs">
              <div className="size-14 rounded-full bg-[#fff0e6] dark:bg-orange-950/40 text-[#d9622b] flex items-center justify-center mx-auto mb-4">
                <Truck className="size-6" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#16181d] dark:text-zinc-100">
                {trucks.length === 0 ? "No tractors registered yet" : "No tractors match your filter"}
              </h3>
              <p className="mt-1 text-xs text-[#73757a] max-w-sm mx-auto">
                {trucks.length === 0
                  ? "Add your power units to assign them to commercial freight runs, monitor odometers, and track terminal locations."
                  : "Try adjusting your search query or status filter to find matching units."}
              </p>
              {canCreate && trucks.length === 0 && (
                <div className="mt-4 inline-block">
                  <AddTruckDialog />
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* Bento Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrucks.map((t) => {
                const isCopied = copiedId === t.id
                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs hover:border-[#b8b1a7] dark:hover:border-zinc-700 transition-all relative flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Unit # and Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="size-9 rounded-xl bg-[#f7f3ec] dark:bg-zinc-800 text-[#d9622b] flex items-center justify-center font-bold font-mono text-xs">
                            <Truck className="size-4" />
                          </div>
                          <div>
                            <span className="font-mono text-sm font-bold text-[#16181d] dark:text-zinc-100 block">
                              Unit #{t.unitNumber}
                            </span>
                            <span className="text-[11px] text-[#73757a] truncate block">
                              {t.year ? `${t.year} ` : ""}
                              {t.make || "Power Unit"} {t.model || ""}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#eee9df] dark:border-zinc-800 text-xs">
                        <div>
                          <span className="font-mono text-[10px] text-[#8a8b8f] uppercase block">
                            License Plate
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-[#16181d] dark:text-zinc-200">
                            {t.licensePlate ? `${t.licensePlate} (${t.licenseState || "US"})` : "—"}
                          </span>
                        </div>

                        <div>
                          <span className="font-mono text-[10px] text-[#8a8b8f] uppercase block">
                            Odometer
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-[#16181d] dark:text-zinc-200">
                            {t.currentMiles ? `${Number(t.currentMiles).toLocaleString()} mi` : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Location & Fuel Specs */}
                      <div className="mt-3 space-y-1.5 pt-2 border-t border-[#eee9df] dark:border-zinc-800 text-xs">
                        <div className="flex items-center justify-between text-[#73757a]">
                          <span className="flex items-center gap-1 text-[11px]">
                            <MapPin className="size-3 text-[#d9622b]" />
                            <span className="truncate max-w-[180px]">
                              {t.currentLocation || "Terminal Yard"}
                            </span>
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 border-[#d1ccc5]">
                            {t.fuelType || "Diesel"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Bottom VIN row */}
                    {t.vin && (
                      <div className="mt-4 pt-2.5 border-t border-[#eee9df] dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-[#8a8b8f]">
                        <span className="truncate max-w-[200px]" title={t.vin}>
                          VIN: {t.vin}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyVin(t.vin!, t.id)}
                          className="hover:text-[#d9622b] transition-colors p-1 cursor-pointer"
                          title="Copy VIN"
                        >
                          {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Data Table View */
            <div className="rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/60">
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Unit #
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Power Unit Specs
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        VIN / Registration
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Current Terminal
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Odometer
                      </th>
                      <th className="text-right font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                    {filteredTrucks.map((t) => (
                      <tr key={t.id} className="hover:bg-[#f7f3ec]/50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#16181d] dark:text-zinc-100">
                          {t.unitNumber}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#16181d] dark:text-zinc-200">
                          {t.year ? `${t.year} ` : ""}
                          {t.make || "Power Unit"} {t.model || ""}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#16181d] dark:text-zinc-200">{t.vin || "—"}</span>
                            {t.vin && (
                              <button
                                type="button"
                                onClick={() => handleCopyVin(t.vin!, t.id)}
                                className="text-[#8a8b8f] hover:text-[#d9622b] cursor-pointer"
                              >
                                {copiedId === t.id ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                              </button>
                            )}
                          </div>
                          {t.licensePlate && (
                            <div className="text-[11px] text-[#73757a]">
                              Plate: {t.licensePlate} ({t.licenseState || "US"})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {t.currentLocation ? (
                            <div className="flex items-center gap-1 text-[#16181d] dark:text-zinc-200">
                              <MapPin className="size-3.5 text-[#d9622b] shrink-0" />
                              <span>{t.currentLocation}</span>
                            </div>
                          ) : (
                            <span className="text-[#8a8b8f]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-[#16181d] dark:text-zinc-200">
                          {t.currentMiles ? `${Number(t.currentMiles).toLocaleString()} mi` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TRAILERS CONTENT ─── */}
      {tab === "trailers" && (
        <>
          {filteredTrailers.length === 0 ? (
            <div className="rounded-3xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-12 text-center shadow-xs">
              <div className="size-14 rounded-full bg-[#fff0e6] dark:bg-orange-950/40 text-[#d9622b] flex items-center justify-center mx-auto mb-4">
                <Box className="size-6" />
              </div>
              <h3 className="font-serif text-xl font-normal text-[#16181d] dark:text-zinc-100">
                {trailers.length === 0 ? "No trailers registered yet" : "No trailers match your filter"}
              </h3>
              <p className="mt-1 text-xs text-[#73757a] max-w-sm mx-auto">
                {trailers.length === 0
                  ? "Register dry vans, reefers, and flatbeds to pair with tractors on dispatches."
                  : "Try adjusting your search query or status filter to find matching units."}
              </p>
              {canCreate && trailers.length === 0 && (
                <div className="mt-4 inline-block">
                  <AddTrailerDialog />
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* Bento Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrailers.map((tr) => {
                const isCopied = copiedId === tr.id
                return (
                  <div
                    key={tr.id}
                    className="p-5 rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs hover:border-[#b8b1a7] dark:hover:border-zinc-700 transition-all relative flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Unit # and Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="size-9 rounded-xl bg-[#f7f3ec] dark:bg-zinc-800 text-[#d9622b] flex items-center justify-center font-bold font-mono text-xs">
                            <Box className="size-4" />
                          </div>
                          <div>
                            <span className="font-mono text-sm font-bold text-[#16181d] dark:text-zinc-100 block">
                              TLR #{tr.unitNumber}
                            </span>
                            <span className="text-[11px] text-[#73757a] truncate block">
                              {tr.type || "Dry Van"}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={tr.status} />
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#eee9df] dark:border-zinc-800 text-xs">
                        <div>
                          <span className="font-mono text-[10px] text-[#8a8b8f] uppercase block">
                            Make / Manufacturer
                          </span>
                          <span className="font-medium text-[#16181d] dark:text-zinc-200">
                            {tr.year ? `${tr.year} ` : ""}
                            {tr.make || "Standard"}
                          </span>
                        </div>

                        <div>
                          <span className="font-mono text-[10px] text-[#8a8b8f] uppercase block">
                            Plate / State
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-[#16181d] dark:text-zinc-200">
                            {tr.licensePlate ? `${tr.licensePlate} (${tr.licenseState || "US"})` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom VIN row */}
                    {tr.vin && (
                      <div className="mt-4 pt-2.5 border-t border-[#eee9df] dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-[#8a8b8f]">
                        <span className="truncate max-w-[200px]" title={tr.vin}>
                          VIN: {tr.vin}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyVin(tr.vin!, tr.id)}
                          className="hover:text-[#d9622b] transition-colors p-1 cursor-pointer"
                          title="Copy VIN"
                        >
                          {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Data Table View */
            <div className="rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/60">
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Trailer Unit #
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Equipment Classification
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Manufacturer
                      </th>
                      <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        VIN / Plate
                      </th>
                      <th className="text-right font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                    {filteredTrailers.map((tr) => (
                      <tr key={tr.id} className="hover:bg-[#f7f3ec]/50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#16181d] dark:text-zinc-100">
                          {tr.unitNumber}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#16181d] dark:text-zinc-200">
                          {tr.type || "Dry Van"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#16181d] dark:text-zinc-200">
                          {tr.year ? `${tr.year} ` : ""}
                          {tr.make || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#16181d] dark:text-zinc-200">{tr.vin || "—"}</span>
                            {tr.vin && (
                              <button
                                type="button"
                                onClick={() => handleCopyVin(tr.vin!, tr.id)}
                                className="text-[#8a8b8f] hover:text-[#d9622b] cursor-pointer"
                              >
                                {copiedId === tr.id ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                              </button>
                            )}
                          </div>
                          {tr.licensePlate && (
                            <div className="text-[11px] text-[#73757a]">
                              Plate: {tr.licensePlate} ({tr.licenseState || "US"})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <StatusBadge status={tr.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
