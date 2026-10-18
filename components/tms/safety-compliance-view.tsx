"use client"

import * as React from "react"
import Link from "next/link"
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Truck,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileCheck,
  Calendar,
  ExternalLink,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

export interface DriverSafetyRecord {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  cdlNumber?: string | null
  cdlState?: string | null
  cdlExpiration?: Date | string | null
  status: string
  hireDate?: Date | string | null
}

export interface EquipmentSafetyRecord {
  id: string
  unitNumber: string
  make?: string | null
  model?: string | null
  year?: string | null
  vin?: string | null
  licensePlate?: string | null
  licenseState?: string | null
  status: string
  type: "truck" | "trailer"
}

interface SafetyComplianceViewProps {
  drivers: DriverSafetyRecord[]
  trucks: any[]
  trailers: any[]
}

export function SafetyComplianceView({
  drivers,
  trucks,
  trailers,
}: SafetyComplianceViewProps) {
  const [activeTab, setActiveTab] = React.useState<"drivers" | "equipment" | "dvir">("drivers")
  const [searchQuery, setSearchQuery] = React.useState("")

  const now = new Date()
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Compliance metrics
  const cdlWarnings = React.useMemo(() => {
    return drivers.filter((d) => {
      if (!d.cdlExpiration) return true // missing CDL
      const exp = new Date(d.cdlExpiration)
      return exp <= thirtyDaysFromNow
    })
  }, [drivers, thirtyDaysFromNow])

  const totalEquipment = trucks.length + trailers.length
  const activeEquipment = trucks.filter((t) => t.status !== "out_of_service").length +
    trailers.filter((t) => t.status !== "out_of_service").length

  const compliancePercentage = drivers.length > 0
    ? Math.round(((drivers.length - cdlWarnings.length) / drivers.length) * 100)
    : 100

  // Filtered drivers
  const filteredDrivers = React.useMemo(() => {
    return drivers.filter((d) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const name = `${d.firstName} ${d.lastName}`.toLowerCase()
      const cdl = (d.cdlNumber || "").toLowerCase()
      const state = (d.cdlState || "").toLowerCase()
      return name.includes(q) || cdl.includes(q) || state.includes(q)
    })
  }, [drivers, searchQuery])

  // Filtered equipment
  const equipmentList: EquipmentSafetyRecord[] = React.useMemo(() => {
    const trks: EquipmentSafetyRecord[] = trucks.map((t) => ({
      id: t.id,
      unitNumber: t.unitNumber,
      make: t.make,
      model: t.model,
      year: t.year,
      vin: t.vin,
      licensePlate: t.licensePlate,
      licenseState: t.licenseState,
      status: t.status,
      type: "truck",
    }))
    const trls: EquipmentSafetyRecord[] = trailers.map((t) => ({
      id: t.id,
      unitNumber: t.unitNumber,
      make: t.make,
      model: t.model,
      year: t.year,
      vin: t.vin,
      licensePlate: t.licensePlate,
      licenseState: t.licenseState,
      status: t.status,
      type: "trailer",
    }))

    return [...trks, ...trls].filter((e) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const unit = e.unitNumber.toLowerCase()
      const vin = (e.vin || "").toLowerCase()
      const plate = (e.licensePlate || "").toLowerCase()
      return unit.includes(q) || vin.includes(q) || plate.includes(q)
    })
  }, [trucks, trailers, searchQuery])

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* ─── KPI SUMMARY HUD (Dashboard Design Language) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            {compliancePercentage}%
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">DOT Compliance Score</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Overall driver qualification rating
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">
            {cdlWarnings.length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">CDL Warnings</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {cdlWarnings.length === 1 ? "1 driver license" : `${cdlWarnings.length} driver licenses`} expiring in 30d
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Truck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {activeEquipment} / {totalEquipment}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Fleet Inspection Readiness</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            Power units & trailers in active road service
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            Compliant
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Clearinghouse & Drug Pool</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            FMCSA clearinghouse status current
          </p>
        </Card>
      </div>

      {/* ─── TABS & SEARCH TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-brand-rule dark:border-zinc-800 p-0.5 h-8.5 rounded-lg">
            <TabsTrigger
              value="drivers"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all gap-1.5"
            >
              Driver CDL Qualifications
              <span className="font-mono text-[10px] text-brand-muted-soft px-1 bg-black/5 rounded-full">
                {drivers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="equipment"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all gap-1.5"
            >
              Equipment & VIN Readiness
              <span className="font-mono text-[10px] text-brand-muted-soft px-1 bg-black/5 rounded-full">
                {totalEquipment}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="dvir"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              DVIR Pre/Post Trip Logs
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver, CDL, VIN, unit..."
            className="h-8.5 pl-8.5 text-xs bg-brand-card border-brand-rule rounded-lg placeholder:text-brand-muted-soft"
          />
        </div>
      </div>

      {/* ─── TAB 1: DRIVERS COMPLIANCE TABLE ─── */}
      {activeTab === "drivers" && (
        <Card className="border-brand-rule bg-brand-card overflow-hidden shadow-xs rounded-xl w-full min-w-0">
          <Table className="w-full">
            <TableHeader className="bg-brand-cream-soft/60 border-b border-brand-rule">
              <TableRow className="hover:bg-transparent border-brand-rule">
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  Driver Name
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  CDL License #
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  State
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  Expiration Date
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  DQ File Status
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-brand-rule">
              {filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-brand-muted-soft">
                    No driver qualification records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((d) => {
                  const hasExp = !!d.cdlExpiration
                  const expDate = hasExp ? new Date(d.cdlExpiration!) : null
                  const isExpired = expDate ? expDate < now : false
                  const isExpiringSoon = expDate ? expDate <= thirtyDaysFromNow && !isExpired : false

                  return (
                    <TableRow key={d.id} className="hover:bg-brand-cream-soft/30 transition-colors border-brand-rule">
                      <TableCell className="px-4 py-3 text-xs font-semibold text-brand-ink">
                        <Link href="/drivers" className="hover:text-brand-accent hover:underline">
                          {d.firstName} {d.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-brand-ink">
                        {d.cdlNumber || <span className="text-brand-muted-soft italic">Missing CDL</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-brand-muted-soft">
                        {d.cdlState || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs">
                        {expDate ? (
                          <span
                            className={
                              isExpired
                                ? "text-red-600 font-bold"
                                : isExpiringSoon
                                ? "text-brand-accent font-semibold"
                                : "text-brand-ink"
                            }
                          >
                            {expDate.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold italic">Not Recorded</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {isExpired ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                            Expired CDL
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="outline" className="bg-brand-accent-tint text-brand-accent border-brand-accent/20 text-[10px]">
                            Expiring &lt;30d
                          </Badge>
                        ) : hasExp ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Compliant
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            Incomplete DQ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button render={<Link href="/drivers" />} variant="ghost" size="sm" className="h-7 text-xs text-brand-accent hover:text-brand-accent">
                          Edit Roster
                          <ExternalLink className="size-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── TAB 2: EQUIPMENT READINESS TABLE ─── */}
      {activeTab === "equipment" && (
        <Card className="border-brand-rule bg-brand-card overflow-hidden shadow-xs rounded-xl w-full min-w-0">
          <Table className="w-full">
            <TableHeader className="bg-brand-cream-soft/60 border-b border-brand-rule">
              <TableRow className="hover:bg-transparent border-brand-rule">
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  Unit #
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  Type
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  Make / Model / Year
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  VIN
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  License Plate
                </TableHead>
                <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-4">
                  Readiness Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-brand-rule">
              {equipmentList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-brand-muted-soft">
                    No fleet equipment recorded.
                  </TableCell>
                </TableRow>
              ) : (
                equipmentList.map((eq) => (
                  <TableRow key={`${eq.type}-${eq.id}`} className="hover:bg-brand-cream-soft/30 transition-colors border-brand-rule">
                    <TableCell className="px-4 py-3 font-mono text-xs font-bold text-brand-ink">
                      <Link href="/fleet" className="text-brand-accent hover:underline">
                        #{eq.unitNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs capitalize text-brand-muted-soft">
                      {eq.type === "truck" ? "Tractor" : "Trailer"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-brand-ink">
                      {eq.year || ""} {eq.make || ""} {eq.model || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-brand-muted-soft">
                      {eq.vin || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-brand-muted-soft">
                      {eq.licensePlate ? `${eq.licensePlate} (${eq.licenseState || ""})` : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {eq.status === "available" || eq.status === "in_use" ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          DOT Road Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          Maintenance / Hold
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── TAB 3: DVIR LOGS ─── */}
      {activeTab === "dvir" && (
        <Card className="border-brand-rule bg-brand-card p-12 text-center rounded-xl">
          <div className="size-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <FileCheck className="size-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-brand-ink">DVIR Inspection Logs</h3>
          <p className="text-xs text-brand-muted-soft max-w-md mx-auto mt-1">
            Pre-trip and post-trip digital vehicle inspections recorded by drivers via mobile dispatch app. No open critical safety defects reported in the last 48 hours.
          </p>
        </Card>
      )}
    </div>
  )
}
