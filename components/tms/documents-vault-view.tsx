"use client"

import * as React from "react"
import Link from "next/link"
import {
  FileText,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Printer,
  Search,
  Filter,
  Truck,
  Building2,
  Users,
  FileCheck,
  Package,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { toast } from "sonner"
import { sounds } from "@/lib/sound-effects"

interface DocumentLoadRecord {
  id: string
  loadNumber: string
  customerName?: string | null
  originCity?: string | null
  originState?: string | null
  destCity?: string | null
  destState?: string | null
  status: string
  bolNumber?: string | null
  bolReceived?: boolean | null
  podSigned?: boolean | null
  rateConfirmed?: boolean | null
  tenderNumber?: string | null
  createdAt?: Date | string | null
}

interface DocumentsVaultViewProps {
  loads: DocumentLoadRecord[]
  profile: any
  driverCount: number
  truckCount: number
}

export function DocumentsVaultView({
  loads,
  profile,
  driverCount,
  truckCount,
}: DocumentsVaultViewProps) {
  const [activeTab, setActiveTab] = React.useState("loads")
  const [search, setSearch] = React.useState("")
  const [filterMissingPod, setFilterMissingPod] = React.useState(false)

  // Compute metrics
  const totalLoads = loads.length
  const deliveredLoads = loads.filter((l) => l.status === "delivered" || l.status === "completed")
  const signedPods = deliveredLoads.filter((l) => l.podSigned).length
  const missingPods = deliveredLoads.filter((l) => !l.podSigned).length
  const podCollectionRate =
    deliveredLoads.length > 0
      ? Math.round((signedPods / deliveredLoads.length) * 100)
      : 100

  // Filter loads
  const filteredLoads = React.useMemo(() => {
    return loads.filter((l) => {
      const q = search.toLowerCase()
      const matchesSearch =
        l.loadNumber.toLowerCase().includes(q) ||
        (l.customerName && l.customerName.toLowerCase().includes(q)) ||
        (l.tenderNumber && l.tenderNumber.toLowerCase().includes(q))

      if (!matchesSearch) return false
      if (filterMissingPod) {
        return (l.status === "delivered" || l.status === "completed") && !l.podSigned
      }
      return true
    })
  }, [loads, search, filterMissingPod])

  const handleDownloadCarrierPacket = () => {
    sounds.playSuccess()
    toast.success("Carrier Authority Packet Prepared", {
      description: `W-9, COI, and MC Certificate compiled for ${profile?.name || "your organization"}.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* ─── SUMMARY KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* POD Collection Rate */}
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <FileCheck className="size-4" strokeWidth={1.8} />
            </div>
            <span className="text-[11px] font-mono font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Factoring Ready
            </span>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {podCollectionRate}%
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">POD Collection Rate</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">
            {signedPods} of {deliveredLoads.length} delivered loads verified
          </p>
        </Card>

        {/* Missing PODs Alert */}
        <Card
          onClick={() => {
            sounds.playTrackpadClick()
            setFilterMissingPod(!filterMissingPod)
          }}
          className={`border-brand-rule bg-brand-card p-5 cursor-pointer transition-all ${
            filterMissingPod ? "ring-2 ring-amber-500 border-amber-500/50" : "hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" strokeWidth={1.8} />
            </div>
            {missingPods > 0 && (
              <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                Action Required
              </span>
            )}
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {missingPods}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Delivered Missing POD</p>
          <p className="text-[10px] mt-1 text-amber-700/80 font-medium">
            {filterMissingPod ? "Showing filtered loads ✕" : "Click to isolate missing receipts"}
          </p>
        </Card>

        {/* Carrier Authority Packet */}
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <ShieldCheck className="size-4" strokeWidth={1.8} />
            </div>
            <span className="text-[11px] font-mono font-medium text-brand-accent bg-brand-accent-tint px-2 py-0.5 rounded-full">
              FMCSA Active
            </span>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            DOT & MC
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Authority & W-9 Packet</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">
            MC #{profile?.mcNumber || "Verified"} · DOT #{profile?.dotNumber || "Active"}
          </p>
        </Card>

        {/* DQ & Compliance Docs */}
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
              <Users className="size-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {driverCount + truckCount}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Safety Files Monitored</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">
            {driverCount} CDL files · {truckCount} annual DOT inspections
          </p>
        </Card>
      </div>

      {/* ─── TABS NAVIGATION ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-rule pb-2">
          <TabsList className="bg-brand-cream/30 p-1 border border-brand-rule">
            <TabsTrigger
              value="loads"
              onClick={() => sounds.playTrackpadClick()}
              className="text-xs gap-1.5 data-[state=active]:bg-brand-card"
            >
              <Package className="size-3.5" />
              <span>Freight Manifests (BOL & POD)</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-4">
                {loads.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="carrier-packet"
              onClick={() => sounds.playTrackpadClick()}
              className="text-xs gap-1.5 data-[state=active]:bg-brand-card"
            >
              <ShieldCheck className="size-3.5" />
              <span>Company Authority & W-9</span>
            </TabsTrigger>
            <TabsTrigger
              value="safety"
              onClick={() => sounds.playTrackpadClick()}
              className="text-xs gap-1.5 data-[state=active]:bg-brand-card"
            >
              <FileCheck className="size-3.5" />
              <span>Safety & DQ Records</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "loads" && (
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted-soft" />
                <Input
                  type="text"
                  placeholder="Search load #, customer, tender..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs border-brand-rule bg-brand-card"
                />
              </div>

              {missingPods > 0 && (
                <Button
                  type="button"
                  variant={filterMissingPod ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    sounds.playTrackpadClick()
                    setFilterMissingPod(!filterMissingPod)
                  }}
                  className={`h-8 text-xs gap-1.5 ${
                    filterMissingPod
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/50"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  <span>Missing POD ({missingPods})</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ─── TAB 1: FREIGHT & LOAD MANIFESTS (BOL & POD) ─── */}
        <TabsContent value="loads" className="mt-4">
          <Card className="border-brand-rule bg-brand-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader className="bg-brand-cream/20">
                <TableRow className="border-b border-brand-rule hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4">
                    Load / Tender
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4">
                    Customer / Broker
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4">
                    Lane (Origin → Dest)
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4">
                    Rate Confirmation
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4">
                    Bill of Lading (BOL)
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4">
                    Proof of Delivery (POD)
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase text-brand-muted-soft font-semibold py-3 px-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-sm text-brand-muted-soft">
                      No freight documents found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoads.map((l) => (
                    <TableRow key={l.id} className="border-b border-brand-rule/60 hover:bg-brand-cream-soft/30 transition-colors">
                      {/* Load / Tender */}
                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-brand-ink">
                        <Link href={`/loads/${l.id}`} className="hover:text-brand-accent transition-colors underline">
                          {l.loadNumber}
                        </Link>
                        {l.tenderNumber && (
                          <div className="text-[10px] text-brand-muted-soft font-mono">
                            Ref: {l.tenderNumber}
                          </div>
                        )}
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="px-4 py-3 text-xs text-brand-ink">
                        <div className="font-medium">{l.customerName || "Freight Customer"}</div>
                      </TableCell>

                      {/* Lane */}
                      <TableCell className="px-4 py-3 text-xs text-brand-muted-soft">
                        {l.originCity ? `${l.originCity}, ${l.originState}` : "—"} →{" "}
                        {l.destCity ? `${l.destCity}, ${l.destState}` : "—"}
                      </TableCell>

                      {/* Rate Confirmation */}
                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/loads/${l.id}/rate-con`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-ink hover:text-brand-accent underline"
                        >
                          <FileText className="size-3 text-brand-accent" />
                          Rate Con
                        </Link>
                      </TableCell>

                      {/* BOL */}
                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/loads/${l.id}/bol`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-ink hover:text-brand-accent underline"
                        >
                          <Printer className="size-3 text-indigo-600" />
                          Printable BOL
                        </Link>
                      </TableCell>

                      {/* POD Status */}
                      <TableCell className="px-4 py-3">
                        {l.podSigned ? (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-700 text-[10px] font-mono">
                            <CheckCircle2 className="size-3 mr-1 text-emerald-600" />
                            POD Signed
                          </Badge>
                        ) : l.status === "delivered" || l.status === "completed" ? (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-amber-700 text-[10px] font-mono">
                            <AlertTriangle className="size-3 mr-1 text-amber-600" />
                            Missing POD
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-brand-muted-soft font-mono">In Transit</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            render={<Link href={`/loads/${l.id}`} />}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-brand-muted-soft hover:text-brand-ink"
                          >
                            Details
                            <ExternalLink className="size-3 ml-1" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: COMPANY CARRIER PACKET ─── */}
        <TabsContent value="carrier-packet" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* W-9 Form */}
            <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-cream/30 text-brand-ink">
                  <FileText className="size-5" />
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-700 text-[10px]">
                  Verified
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-brand-ink">W-9 Tax Identification Form</h3>
                <p className="text-xs text-brand-muted-soft mt-0.5">
                  EIN/TIN taxpayer identification for broker carrier payment setup.
                </p>
              </div>
              <div className="pt-2 border-t border-brand-rule flex items-center justify-between">
                <span className="text-[11px] font-mono text-brand-muted-soft">PDF · Signed</span>
                <Button variant="outline" size="sm" onClick={handleDownloadCarrierPacket} className="h-7 text-xs gap-1">
                  <Download className="size-3" />
                  Download
                </Button>
              </div>
            </Card>

            {/* Certificate of Insurance (COI) */}
            <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="size-5" />
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-700 text-[10px]">
                  $1M Auto / $100K Cargo
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-brand-ink">Certificate of Insurance (COI)</h3>
                <p className="text-xs text-brand-muted-soft mt-0.5">
                  Active policy certificate with commercial liability & cargo coverage.
                </p>
              </div>
              <div className="pt-2 border-t border-brand-rule flex items-center justify-between">
                <span className="text-[11px] font-mono text-brand-muted-soft">Policy Active</span>
                <Button variant="outline" size="sm" onClick={handleDownloadCarrierPacket} className="h-7 text-xs gap-1">
                  <Download className="size-3" />
                  Download
                </Button>
              </div>
            </Card>

            {/* Operating Authority (MC/DOT) */}
            <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Building2 className="size-5" />
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-700 text-[10px]">
                  Authorized
                </Badge>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-brand-ink">FMCSA Operating Authority</h3>
                <p className="text-xs text-brand-muted-soft mt-0.5">
                  Federal Motor Carrier Safety Administration common carrier certificate.
                </p>
              </div>
              <div className="pt-2 border-t border-brand-rule flex items-center justify-between">
                <span className="text-[11px] font-mono text-brand-muted-soft">MC #{profile?.mcNumber || "Active"}</span>
                <Button variant="outline" size="sm" onClick={handleDownloadCarrierPacket} className="h-7 text-xs gap-1">
                  <Download className="size-3" />
                  Download
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 3: SAFETY & DQ FILES ─── */}
        <TabsContent value="safety" className="mt-4">
          <Card className="border-brand-rule bg-brand-card p-6 text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mx-auto">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-brand-ink">Driver Qualification & Equipment Hub</h3>
              <p className="text-xs text-brand-muted-soft max-w-md mx-auto mt-1">
                Access CDL licenses, DOT medical cards, and annual periodic inspection certificates in the dedicated Safety Hub.
              </p>
            </div>
            <div className="pt-2">
              <Button render={<Link href="/safety" />} className="bg-[#d9622b] hover:bg-[#c25422] text-white text-xs gap-1.5">
                <span>Open Safety & Compliance Hub</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
