"use client"

import * as React from "react"
import Link from "next/link"
import {
  Banknote,
  Truck,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CreateCarrierDialog } from "@/components/tms/create-carrier-dialog"
import { CreateCarrierPaymentDialog } from "@/components/tms/create-carrier-payment-dialog"
import { CarrierStatusActions } from "@/components/tms/carrier-status-actions"
import { formatWorkspaceDate } from "@/lib/timezone"

interface CarrierPayClientProps {
  payments: Array<{
    id: string
    carrierId: string | null
    tripId: string | null
    amount: string
    additions: string | null
    deductions: string | null
    netAmount: string | null
    currency: string | null
    status: string
    invoiceNumber: string | null
    paymentDate: Date | null
    paymentMethod: string | null
    referenceNumber: string | null
    notes: string | null
    createdAt: Date
    carrierName: string | null
    carrierMcNumber: string | null
    carrierDotNumber: string | null
    carrierPhone: string | null
    carrierEmail: string | null
    carrierPaymentTerms: string | null
    tripNumber: string | null
    tripMiles: string | null
    loadId: string | null
    loadNumber: string | null
    originCity: string | null
    originState: string | null
    destCity: string | null
    destState: string | null
    driverFirstName: string | null
    driverLastName: string | null
  }>
  carriers: Array<{
    id: string
    name: string
    mcNumber: string | null
    dotNumber: string | null
    contactName: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    country: string | null
    zip: string | null
    taxId: string | null
    paymentTerms: string | null
    currency: string | null
    insuranceExpiry: Date | null
    status: string
    notes: string | null
    createdAt: Date
  }>
  trips: Array<{
    id: string
    tripNumber: string
    loadNumber?: string | null
  }>
  userTimeZone: string
}

export function CarrierPayClient({
  payments,
  carriers,
  trips,
  userTimeZone,
}: CarrierPayClientProps) {
  const [activeTab, setActiveTab] = React.useState<"settlements" | "carriers">("settlements")
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  // KPI calculations
  let pendingSum = 0
  let pendingCount = 0
  let approvedSum = 0
  let approvedCount = 0
  let paidSum = 0
  let paidCount = 0

  for (const p of payments) {
    const net = parseFloat(p.netAmount || p.amount || "0")
    if (p.status === "pending") {
      pendingSum += net
      pendingCount++
    } else if (p.status === "approved") {
      approvedSum += net
      approvedCount++
    } else if (p.status === "paid") {
      paidSum += net
      paidCount++
    }
  }

  // Filter settlements
  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.carrierName && p.carrierName.toLowerCase().includes(q)) ||
      (p.carrierMcNumber && p.carrierMcNumber.toLowerCase().includes(q)) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
      (p.tripNumber && p.tripNumber.toLowerCase().includes(q)) ||
      (p.loadNumber && p.loadNumber.toLowerCase().includes(q))
    )
  })

  // Filter carriers
  const filteredCarriers = carriers.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.mcNumber && c.mcNumber.toLowerCase().includes(q)) ||
      (c.dotNumber && c.dotNumber.toLowerCase().includes(q)) ||
      (c.contactName && c.contactName.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    )
  })

  const carriersOptionList = carriers.map((c) => ({
    id: c.id,
    name: c.name,
    mcNumber: c.mcNumber,
    paymentTerms: c.paymentTerms,
  }))

  return (
    <div className="space-y-6">
      {/* ─── KPI CARDS ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">
              Pending Approval
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-brand-ink">
              ${pendingSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-xs text-brand-muted-soft">
              {pendingCount} settlement{pendingCount === 1 ? "" : "s"} waiting for audit
            </p>
          </div>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">
              Ready to Pay
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
              ${approvedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-xs text-brand-muted-soft">
              {approvedCount} approved for remittance
            </p>
          </div>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">
              Settled / Remitted
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              ${paidSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-xs text-brand-muted-soft">
              {paidCount} payment{paidCount === 1 ? "" : "s"} disbursed
            </p>
          </div>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">
              Partner Carriers
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-brand-ink">
              {carriers.length}
            </span>
            <p className="mt-1 text-xs text-brand-muted-soft">
              Registered motor carriers on file
            </p>
          </div>
        </Card>
      </div>

      {/* ─── TABS & CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-brand-rule pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("settlements")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "settlements"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Carrier Settlements ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("carriers")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "carriers"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Carriers Directory ({carriers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "settlements" ? (
            <>
              <CreateCarrierDialog />
              <CreateCarrierPaymentDialog
                carriers={carriersOptionList}
                trips={trips}
              />
            </>
          ) : (
            <CreateCarrierDialog />
          )}
        </div>
      </div>

      {/* ─── SEARCH & STATUS FILTERS ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "settlements"
                ? "Search by carrier, MC#, invoice, trip..."
                : "Search carriers by name, MC#, DOT#..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {activeTab === "settlements" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "pending", "approved", "paid", "void"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-muted text-foreground border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── TAB 1: SETTLEMENTS TABLE ─── */}
      {activeTab === "settlements" && (
        <Card className="border-brand-rule overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-brand-rule font-medium">
                <tr>
                  <th className="py-3 px-4">Carrier & MC#</th>
                  <th className="py-3 px-4">Linked Lane / Trip</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4 text-right">Agreed Rate</th>
                  <th className="py-3 px-4 text-right">Add / Ded</th>
                  <th className="py-3 px-4 text-right">Net Remittance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Settlement Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-rule">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Banknote className="h-8 w-8 text-muted-foreground/50" />
                        <span className="font-medium text-foreground">No carrier settlements found</span>
                        <span className="text-xs">
                          {search
                            ? "Try adjusting your search criteria"
                            : "Create your first carrier settlement or assign an outside carrier to a trip."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const add = Number(p.additions || "0")
                    const ded = Number(p.deductions || "0")
                    const net = p.netAmount || p.amount

                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {p.carrierName || "Contracted Carrier"}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                            {p.carrierMcNumber && <span>{p.carrierMcNumber}</span>}
                            {p.carrierPaymentTerms && (
                              <span className="text-[11px] font-sans px-1.5 py-0.2 rounded bg-muted">
                                {p.carrierPaymentTerms}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {p.tripNumber ? (
                            <div>
                              <div className="font-mono text-xs font-semibold text-primary">
                                Trip #{p.tripNumber}
                              </div>
                              {p.originCity && p.destCity ? (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {p.originCity}, {p.originState} → {p.destCity}, {p.destState}
                                </div>
                              ) : p.loadNumber ? (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Load #{p.loadNumber}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Manual settlement</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs">
                          {p.invoiceNumber ? (
                            <span className="px-1.5 py-0.5 rounded bg-muted/60 border text-foreground">
                              {p.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-medium">
                          ${parseFloat(p.amount).toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-xs">
                          {add > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 block">
                              +${add.toFixed(2)}
                            </span>
                          )}
                          {ded > 0 && (
                            <span className="text-destructive block">
                              -${ded.toFixed(2)}
                            </span>
                          )}
                          {add === 0 && ded === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-foreground">
                            ${parseFloat(net).toFixed(2)}
                          </span>
                          <span className="text-[11px] text-muted-foreground block font-mono">
                            {p.currency || "USD"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              p.status === "paid"
                                ? "default"
                                : p.status === "approved"
                                ? "secondary"
                                : p.status === "void"
                                ? "destructive"
                                : "outline"
                            }
                            className="capitalize text-xs font-medium"
                          >
                            {p.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <CarrierStatusActions payment={p} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── TAB 2: OUTSIDE CARRIERS DIRECTORY ─── */}
      {activeTab === "carriers" && (
        <Card className="border-brand-rule overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-brand-rule font-medium">
                <tr>
                  <th className="py-3 px-4">Carrier Name</th>
                  <th className="py-3 px-4">Authorities (MC / DOT)</th>
                  <th className="py-3 px-4">Contact & Dispatch</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Insurance Compliance</th>
                  <th className="py-3 px-4">Terms & Currency</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-rule">
                {filteredCarriers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="h-8 w-8 text-muted-foreground/50" />
                        <span className="font-medium text-foreground">No outside carriers registered</span>
                        <span className="text-xs">
                          {search
                            ? "Try adjusting your search criteria"
                            : "Click '+ Add Outside Carrier' to register your contracted motor carriers."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCarriers.map((c) => {
                    const isExpiringSoon =
                      c.insuranceExpiry &&
                      new Date(c.insuranceExpiry) < new Date(Date.now() + 14 * 86400000)
                    const isExpired =
                      c.insuranceExpiry && new Date(c.insuranceExpiry) < new Date()

                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{c.name}</div>
                          {c.notes && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {c.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-xs">
                          {c.mcNumber && <div className="text-foreground">{c.mcNumber}</div>}
                          {c.dotNumber && (
                            <div className="text-muted-foreground">USDOT #{c.dotNumber}</div>
                          )}
                          {!c.mcNumber && !c.dotNumber && <span className="text-muted-foreground">—</span>}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          {c.contactName && <div className="font-medium text-foreground">{c.contactName}</div>}
                          {c.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                              <Phone className="h-3 w-3" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                              <Mail className="h-3 w-3" />
                              <span>{c.email}</span>
                            </div>
                          )}
                          {!c.contactName && !c.phone && !c.email && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          {c.city || c.state ? (
                            <div className="flex items-center gap-1 text-foreground">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {c.city ? `${c.city}, ` : ""}
                                {c.state || ""} {c.country ? `(${c.country})` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          {c.insuranceExpiry ? (
                            <div className="flex items-center gap-1.5">
                              {isExpired ? (
                                <Badge variant="destructive" className="gap-1 text-[11px]">
                                  <ShieldAlert className="h-3 w-3" />
                                  Expired
                                </Badge>
                              ) : isExpiringSoon ? (
                                <Badge variant="outline" className="gap-1 text-[11px] border-amber-500 text-amber-600 dark:text-amber-400">
                                  <ShieldAlert className="h-3 w-3" />
                                  Expires Soon
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-[11px] border-emerald-500 text-emerald-600 dark:text-emerald-400">
                                  <ShieldCheck className="h-3 w-3" />
                                  Valid
                                </Badge>
                              )}
                              <span className="font-mono text-muted-foreground">
                                {formatWorkspaceDate(c.insuranceExpiry, userTimeZone)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No certificate on file</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <span className="font-medium text-foreground">{c.paymentTerms || "Net 30"}</span>
                          <span className="text-muted-foreground block font-mono text-[11px]">
                            {c.currency || "USD"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={c.status === "active" ? "default" : "secondary"}
                            className="capitalize text-xs font-medium"
                          >
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
