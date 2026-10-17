"use client"

import * as React from "react"
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Clock,
  Search,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
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
import { CreateCustomerDialog } from "@/components/tms/create-customer-dialog"
import { CreateFacilityDialog } from "@/components/tms/create-facility-dialog"

export interface CustomerRecord {
  id: string
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  paymentTerms?: string | null
  currency?: string | null
  creditLimit?: string | null
  status: string
  notes?: string | null
}

export interface FacilityRecord {
  id: string
  name: string
  facilityType?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  operatingHours?: string | null
  appointmentRequired?: boolean | null
  contactName?: string | null
  contactPhone?: string | null
  checkInInstructions?: string | null
  notes?: string | null
}

interface CustomersDirectoryViewProps {
  customers: CustomerRecord[]
  facilities: FacilityRecord[]
}

export function CustomersDirectoryView({
  customers,
  facilities,
}: CustomersDirectoryViewProps) {
  const [activeTab, setActiveTab] = React.useState<"customers" | "facilities">("customers")
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [facilitySearch, setFacilitySearch] = React.useState("")

  const filteredCustomers = React.useMemo(() => {
    if (!customerSearch.trim()) return customers
    const q = customerSearch.toLowerCase().trim()
    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q)
      const matchContact = (c.contactName || "").toLowerCase().includes(q)
      const matchEmail = (c.email || "").toLowerCase().includes(q)
      const matchPhone = (c.phone || "").toLowerCase().includes(q)
      const matchCity = `${c.city || ""} ${c.state || ""}`.toLowerCase().includes(q)
      return matchName || matchContact || matchEmail || matchPhone || matchCity
    })
  }, [customers, customerSearch])

  const filteredFacilities = React.useMemo(() => {
    if (!facilitySearch.trim()) return facilities
    const q = facilitySearch.toLowerCase().trim()
    return facilities.filter((f) => {
      const matchName = f.name.toLowerCase().includes(q)
      const matchType = (f.facilityType || "").toLowerCase().includes(q)
      const matchAddress = (f.address || "").toLowerCase().includes(q)
      const matchCity = `${f.city || ""} ${f.state || ""}`.toLowerCase().includes(q)
      const matchContact = (f.contactName || "").toLowerCase().includes(q)
      return matchName || matchType || matchAddress || matchCity || matchContact
    })
  }, [facilities, facilitySearch])

  return (
    <div className="space-y-4">
      {/* ─── TABS & CONTROLS ─── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "customers" | "facilities")}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 p-0.5 h-8.5 rounded-lg w-full sm:w-auto">
            <TabsTrigger
              value="customers"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              <Building2 className="size-3.5" />
              Customers & Brokers
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {customers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="facilities"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              <MapPin className="size-3.5" />
              Facilities & Terminals
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {facilities.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "customers" ? (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search company, contact, city..."
                  className="h-8.5 pl-8.5 text-xs bg-[#fdfbf7] dark:bg-zinc-950 border-[#e4ddd3] dark:border-zinc-800 rounded-lg placeholder:text-[#8a8b8f]"
                />
                {customerSearch && (
                  <button
                    onClick={() => setCustomerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8a8b8f] hover:text-[#16181d] dark:hover:text-zinc-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
                <Input
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  placeholder="Search facility name, dock type, city..."
                  className="h-8.5 pl-8.5 text-xs bg-[#fdfbf7] dark:bg-zinc-950 border-[#e4ddd3] dark:border-zinc-800 rounded-lg placeholder:text-[#8a8b8f]"
                />
                {facilitySearch && (
                  <button
                    onClick={() => setFacilitySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8a8b8f] hover:text-[#16181d] dark:hover:text-zinc-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── CUSTOMERS TAB CONTENT ─── */}
        <TabsContent value="customers" className="mt-0">
          <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
            <Table>
              <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
                <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Company Name
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Billing Contact
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Location
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Payment Terms
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Currency
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Credit Limit
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-[#8a8b8f]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Building2 className="size-5 text-[#8a8b8f]/60" />
                        <p className="font-medium text-[#16181d] dark:text-zinc-200">
                          {customerSearch ? "No matching customers found" : "No customers saved yet"}
                        </p>
                        <p className="text-[11px] text-[#8a8b8f]">
                          {customerSearch
                            ? "Try adjusting your search terms"
                            : "Add shippers and freight brokers using the button above"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((c) => (
                    <TableRow
                      key={c.id}
                      className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                    >
                      {/* Company Name */}
                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-[#16181d] dark:text-zinc-100 text-xs">
                          {c.name}
                        </p>
                        {c.notes && (
                          <p className="text-[10px] text-[#8a8b8f] line-clamp-1">{c.notes}</p>
                        )}
                      </TableCell>

                      {/* Billing Contact */}
                      <TableCell className="px-4 py-3 text-xs">
                        {c.contactName && (
                          <p className="font-medium text-[#16181d] dark:text-zinc-200 text-xs">
                            {c.contactName}
                          </p>
                        )}
                        {c.email && (
                          <p className="flex items-center gap-1 text-[11px] text-[#8a8b8f] font-mono">
                            <Mail className="size-2.5 shrink-0" />
                            {c.email}
                          </p>
                        )}
                        {c.phone && (
                          <p className="flex items-center gap-1 text-[11px] text-[#8a8b8f] font-mono">
                            <Phone className="size-2.5 shrink-0" />
                            {c.phone}
                          </p>
                        )}
                        {!c.contactName && !c.email && !c.phone && (
                          <span className="text-[#8a8b8f] text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-200">
                        <p>
                          {[c.city, c.state, c.country !== "US" ? c.country : null]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </p>
                        {c.address && (
                          <p className="text-[10px] text-[#8a8b8f]">{c.address}</p>
                        )}
                      </TableCell>

                      {/* Terms */}
                      <TableCell className="px-4 py-3 font-mono">
                        <Badge
                          variant="outline"
                          className="border-[#e4ddd3] text-[#16181d] dark:text-zinc-200 text-[10px] font-mono"
                        >
                          {c.paymentTerms || "Net 30"}
                        </Badge>
                      </TableCell>

                      {/* Currency */}
                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-200">
                        {c.currency || "USD"}
                      </TableCell>

                      {/* Credit Limit */}
                      <TableCell className="px-4 py-3 font-mono text-xs text-[#16181d] dark:text-zinc-200">
                        {c.creditLimit ? `$${Number(c.creditLimit).toLocaleString()}` : "—"}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ─── FACILITIES TAB CONTENT ─── */}
        <TabsContent value="facilities" className="mt-0">
          <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
            <Table>
              <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
                <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Facility Name
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Dock Role
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Address
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Operating Hours
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                    Dock Contact
                  </TableHead>
                  <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 max-w-xs">
                    Driver Check-In Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                {filteredFacilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-[#8a8b8f]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <MapPin className="size-5 text-[#8a8b8f]/60" />
                        <p className="font-medium text-[#16181d] dark:text-zinc-200">
                          {facilitySearch ? "No matching facilities found" : "No facilities saved yet"}
                        </p>
                        <p className="text-[11px] text-[#8a8b8f]">
                          {facilitySearch
                            ? "Try adjusting your search terms"
                            : "Save recurring pickup and delivery docks using the button above"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacilities.map((f) => (
                    <TableRow
                      key={f.id}
                      className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                    >
                      {/* Facility Name */}
                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-[#16181d] dark:text-zinc-100 text-xs">
                          {f.name}
                        </p>
                        {f.notes && (
                          <p className="text-[10px] text-[#8a8b8f] line-clamp-1">{f.notes}</p>
                        )}
                      </TableCell>

                      {/* Dock Role */}
                      <TableCell className="px-4 py-3 font-mono">
                        <Badge
                          variant="outline"
                          className="border-[#e4ddd3] text-[#16181d] dark:text-zinc-200 text-[10px] uppercase font-mono"
                        >
                          {f.facilityType?.replace(/_/g, " ") || "Dual Dock"}
                        </Badge>
                      </TableCell>

                      {/* Address */}
                      <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-200">
                        <p className="font-medium">{f.address}</p>
                        <p className="text-[10px] text-[#8a8b8f]">
                          {f.city}, {f.state} {f.zip} {f.country !== "US" ? `(${f.country})` : ""}
                        </p>
                      </TableCell>

                      {/* Operating Hours */}
                      <TableCell className="px-4 py-3">
                        <p className="flex items-center gap-1 text-[#16181d] dark:text-zinc-200 font-mono text-[11px]">
                          <Clock className="size-3 text-[#8a8b8f]" />
                          {f.operatingHours || "07:00 - 16:00"}
                        </p>
                        {f.appointmentRequired && (
                          <p className="text-[10px] text-blue-600 font-mono">Appt Required</p>
                        )}
                      </TableCell>

                      {/* Dock Contact */}
                      <TableCell className="px-4 py-3 text-xs">
                        {f.contactName && (
                          <p className="font-medium text-[#16181d] dark:text-zinc-200 text-xs">
                            {f.contactName}
                          </p>
                        )}
                        {f.contactPhone && (
                          <p className="flex items-center gap-1 text-[11px] text-[#8a8b8f] font-mono">
                            <Phone className="size-2.5" />
                            {f.contactPhone}
                          </p>
                        )}
                        {!f.contactName && !f.contactPhone && (
                          <span className="text-[#8a8b8f] text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Driver Check-In Notes */}
                      <TableCell className="px-4 py-3 max-w-xs">
                        {f.checkInInstructions ? (
                          <p className="text-[10px] text-[#73757a] bg-[#f7f3ec]/60 dark:bg-zinc-900/60 p-1.5 rounded-md border border-[#e4ddd3] dark:border-zinc-800 line-clamp-2">
                            {f.checkInInstructions}
                          </p>
                        ) : (
                          <span className="text-[#8a8b8f] text-xs">—</span>
                        )}
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
