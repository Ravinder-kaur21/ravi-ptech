import { notFound, redirect } from "next/navigation"
import { Building2, MapPin, Phone, Mail, DollarSign, ShieldCheck, Clock, FileText } from "lucide-react"
import { getSession, getCustomersForOrg, getFacilitiesForOrg } from "@/lib/dal"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateCustomerDialog } from "@/components/tms/create-customer-dialog"
import { CreateFacilityDialog } from "@/components/tms/create-facility-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export const instant = false

export default async function CustomersDirectoryPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [customers, facilities] = await Promise.all([
    getCustomersForOrg(tenantId),
    getFacilitiesForOrg(tenantId),
  ])

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── PAGE HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Customers & Facilities
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Directory of approved shippers, freight brokers, billing terms, and physical facility locations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateFacilityDialog />
          <CreateCustomerDialog />
        </div>
      </div>

      {/* ─── STATS & OVERVIEW ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Active Accounts
            </span>
            <Building2 className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            {customers.length}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Shippers & logistics brokers
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Saved Facilities
            </span>
            <MapPin className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            {facilities.length}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Docks, terminals & yards
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Standard Terms
            </span>
            <DollarSign className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            Net 30
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Primary AR credit window
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Carrier Facilities
            </span>
            <ShieldCheck className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-serif text-brand-ink">
            {facilities.filter((f) => f.facilityType === "terminal" || f.facilityType === "yard").length}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Terminals & drop yards
          </p>
        </Card>
      </div>

      {/* ─── TABS CONTENT ─── */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="bg-brand-cream/40 dark:bg-zinc-900 border border-brand-rule">
          <TabsTrigger value="customers" className="gap-1.5 text-xs">
            <Building2 className="size-3.5" />
            Customers & Brokers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="facilities" className="gap-1.5 text-xs">
            <MapPin className="size-3.5" />
            Facilities & Terminals ({facilities.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── CUSTOMERS TAB ─── */}
        <TabsContent value="customers">
          <Card className="border-brand-rule bg-brand-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-rule bg-brand-cream/30 dark:bg-zinc-900/50 text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Billing Contact</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Terms</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Credit Limit</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-rule font-sans">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-muted-soft">
                        <Building2 className="size-8 mx-auto text-brand-muted-soft/40 mb-2" />
                        <p className="font-medium text-sm text-brand-ink">No customers saved yet</p>
                        <p className="text-xs text-brand-muted-soft mt-0.5">
                          Add your shipping customers and freight brokers to streamline load creation and billing.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-brand-cream/10 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-brand-ink text-sm">{c.name}</p>
                          {c.notes && (
                            <p className="text-[11px] text-brand-muted-soft line-clamp-1">{c.notes}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 space-y-0.5">
                          {c.contactName && <p className="font-medium text-brand-ink">{c.contactName}</p>}
                          {c.email && (
                            <p className="flex items-center gap-1 text-[11px] text-brand-muted-soft">
                              <Mail className="size-3" />
                              {c.email}
                            </p>
                          )}
                          {c.phone && (
                            <p className="flex items-center gap-1 text-[11px] text-brand-muted-soft">
                              <Phone className="size-3" />
                              {c.phone}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-brand-ink">
                            {[c.city, c.state, c.country !== "US" ? c.country : null]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                          {c.address && (
                            <p className="text-[11px] text-brand-muted-soft">{c.address}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <Badge variant="outline" className="text-[10px]">
                            {c.paymentTerms || "Net 30"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-brand-ink">
                          {c.currency || "USD"}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {c.creditLimit ? `$${Number(c.creditLimit).toLocaleString()}` : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
                          >
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── FACILITIES TAB ─── */}
        <TabsContent value="facilities">
          <Card className="border-brand-rule bg-brand-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-rule bg-brand-cream/30 dark:bg-zinc-900/50 text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                    <th className="py-3 px-4">Facility Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Physical Address</th>
                    <th className="py-3 px-4">Operating Hours</th>
                    <th className="py-3 px-4">Dock Contact</th>
                    <th className="py-3 px-4">Driver Check-In Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-rule font-sans">
                  {facilities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-brand-muted-soft">
                        <MapPin className="size-8 mx-auto text-brand-muted-soft/40 mb-2" />
                        <p className="font-medium text-sm text-brand-ink">No facilities saved yet</p>
                        <p className="text-xs text-brand-muted-soft mt-0.5">
                          Save recurring shippers, receivers, distribution centers, and yards for 1-click load stops.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    facilities.map((f) => (
                      <tr key={f.id} className="hover:bg-brand-cream/10 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-brand-ink text-sm">{f.name}</p>
                          {f.notes && (
                            <p className="text-[11px] text-brand-muted-soft line-clamp-1">{f.notes}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {f.facilityType?.replace(/_/g, " ") || "Dual"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-brand-ink">{f.address}</p>
                          <p className="text-[11px] text-brand-muted-soft">
                            {f.city}, {f.state} {f.zip} {f.country !== "US" ? `(${f.country})` : ""}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="flex items-center gap-1 text-brand-ink font-mono text-[11px]">
                            <Clock className="size-3 text-brand-muted-soft" />
                            {f.operatingHours || "07:00 - 16:00"}
                          </p>
                          {f.appointmentRequired && (
                            <p className="text-[10px] text-blue-600 font-mono">Appt Required</p>
                          )}
                        </td>
                        <td className="py-3 px-4 space-y-0.5">
                          {f.contactName && <p className="font-medium text-brand-ink">{f.contactName}</p>}
                          {f.contactPhone && (
                            <p className="flex items-center gap-1 text-[11px] text-brand-muted-soft">
                              <Phone className="size-3" />
                              {f.contactPhone}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {f.checkInInstructions ? (
                            <p className="text-[11px] text-brand-muted-soft bg-brand-cream/20 p-1.5 rounded border border-brand-rule/60 line-clamp-2">
                              {f.checkInInstructions}
                            </p>
                          ) : (
                            <span className="text-brand-muted-soft/60">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
