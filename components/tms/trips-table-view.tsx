"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  Navigation,
  Truck,
  User,
  Phone,
  ExternalLink,
  ArrowUpRight,
  MapPin,
  RotateCcw,
  Receipt,
  CheckCircle2,
  Clock,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { TripStatusUpdater } from "@/components/tms/trip-status-updater"
import { RecordExpenseDialog } from "@/components/tms/record-expense-dialog"

export interface TripRecord {
  id: string
  tripNumber: string
  loadId?: string | null
  loadNumber?: string | null
  status: string
  originCity?: string | null
  originState?: string | null
  destCity?: string | null
  destState?: string | null
  driverFirstName?: string | null
  driverLastName?: string | null
  driverPhone?: string | null
  truckUnitNumber?: string | null
  trailerUnitNumber?: string | null
  emptyMiles?: string | null
  loadedMiles?: string | null
  startedAt?: Date | string | null
  completedAt?: Date | string | null
  notes?: string | null
}

interface TripsTableViewProps {
  trips: TripRecord[]
  drivers: Array<{
    id: string
    firstName: string
    lastName: string
  }>
}

export function TripsTableView({ trips, drivers }: TripsTableViewProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "active" | "completed">("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const tripOptions = React.useMemo(() => {
    return trips.map((t) => ({
      id: t.id,
      tripNumber: t.tripNumber,
      loadNumber: t.loadNumber,
    }))
  }, [trips])

  const filteredTrips = React.useMemo(() => {
    return trips.filter((t) => {
      // Tab filter
      if (activeTab === "active" && t.status !== "in_progress" && t.status !== "pending") {
        return false
      }
      if (activeTab === "completed" && t.status !== "completed") {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchNumber = t.tripNumber.toLowerCase().includes(q)
        const matchLoad = (t.loadNumber || "").toLowerCase().includes(q)
        const matchOrigin = `${t.originCity || ""} ${t.originState || ""}`.toLowerCase().includes(q)
        const matchDest = `${t.destCity || ""} ${t.destState || ""}`.toLowerCase().includes(q)
        const matchDriver = `${t.driverFirstName || ""} ${t.driverLastName || ""}`.toLowerCase().includes(q)
        const matchTruck = (t.truckUnitNumber || "").toLowerCase().includes(q)
        const matchTrailer = (t.trailerUnitNumber || "").toLowerCase().includes(q)

        return (
          matchNumber ||
          matchLoad ||
          matchOrigin ||
          matchDest ||
          matchDriver ||
          matchTruck ||
          matchTrailer
        )
      }

      return true
    })
  }, [trips, activeTab, searchQuery])

  const activeCount = trips.filter((t) => t.status === "in_progress" || t.status === "pending").length
  const completedCount = trips.filter((t) => t.status === "completed").length

  return (
    <div className="space-y-4">
      {/* ─── Search & Tab Filters Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "active" | "completed")}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 p-0.5 h-8.5 rounded-lg">
            <TabsTrigger
              value="all"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              All Trips
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {trips.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Rolling & Active
              <span className="font-mono text-[10px] text-[#d9622b] font-semibold px-1 bg-[#fff0e6] dark:bg-orange-950/40 rounded-full">
                {activeCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Delivered
              <span className="font-mono text-[10px] text-emerald-600 font-semibold px-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                {completedCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trips, loads, drivers, units..."
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
      </div>

      {/* ─── Shadcn Table ─── */}
      <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
        <Table>
          <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
            <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Trip #
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Linked Load
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Route & Nav
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Driver
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Equipment
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Status
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
            {filteredTrips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-[#8a8b8f]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Truck className="size-5 text-[#8a8b8f]/60" />
                    <p className="font-medium text-[#16181d] dark:text-zinc-200">
                      No matching trips found
                    </p>
                    <p className="text-[11px] text-[#8a8b8f]">
                      {searchQuery
                        ? "Try adjusting your search criteria"
                        : "No trips currently match this status filter"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTrips.map((t) => {
                const mapUrl =
                  t.originCity && t.destCity
                    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                        `${t.originCity}, ${t.originState || ""}`
                      )}&destination=${encodeURIComponent(`${t.destCity}, ${t.destState || ""}`)}`
                    : null

                return (
                  <TableRow
                    key={t.id}
                    className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                  >
                    {/* Trip # */}
                    <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                      {t.tripNumber}
                    </TableCell>

                    {/* Linked Load */}
                    <TableCell className="px-4 py-3">
                      {t.loadId ? (
                        <Link
                          href={`/loads/${t.loadId}`}
                          className="font-mono text-xs text-[#d9622b] hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          {t.loadNumber || "View Load"}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-[#8a8b8f] font-mono text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Route & Nav */}
                    <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[200px]">
                          {t.originCity ? `${t.originCity}, ${t.originState || ""}` : "—"}{" "}
                          <span className="text-[#8a8b8f]">→</span>{" "}
                          {t.destCity ? `${t.destCity}, ${t.destState || ""}` : "—"}
                        </span>
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open route in Google Maps"
                            className="text-[#8a8b8f] hover:text-[#d9622b] transition-colors shrink-0"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>

                    {/* Driver */}
                    <TableCell className="px-4 py-3 text-xs">
                      {t.driverFirstName ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-[#16181d] dark:text-zinc-100">
                            <User className="size-3.5 text-[#8a8b8f] shrink-0" />
                            <span>
                              {t.driverFirstName} {t.driverLastName}
                            </span>
                          </div>
                          {t.driverPhone && (
                            <a
                              href={`tel:${t.driverPhone}`}
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-[#d9622b] hover:underline"
                            >
                              <Phone className="size-2.5" />
                              <span>{t.driverPhone}</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8a8b8f] text-xs">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Equipment */}
                    <TableCell className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                        <span className="text-[#16181d] dark:text-zinc-100">
                          Power: {t.truckUnitNumber ? `#${t.truckUnitNumber}` : "—"}
                        </span>
                        {t.trailerUnitNumber && (
                          <span className="text-[#8a8b8f]">
                            TLR: #{t.trailerUnitNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TripStatusUpdater tripId={t.id} currentStatus={t.status} />
                        <RecordExpenseDialog
                          trips={tripOptions}
                          defaultTripId={t.id}
                          drivers={drivers}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
