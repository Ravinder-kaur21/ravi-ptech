import { notFound, redirect } from "next/navigation"
import { Building2, MapPin, Phone, Mail, DollarSign, ShieldCheck, Clock, FileText } from "lucide-react"
import { getSession, getCustomersForOrg, getFacilitiesForOrg } from "@/lib/dal"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateCustomerDialog } from "@/components/tms/create-customer-dialog"
import { CreateFacilityDialog } from "@/components/tms/create-facility-dialog"
import { CustomersDirectoryView } from "@/components/tms/customers-directory-view"

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

      {/* ─── STATS & OVERVIEW (Dashboard Taste KPI Cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {customers.length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active Accounts</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Shippers & logistics brokers</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <MapPin className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            {facilities.length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Saved Facilities</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Docks, terminals & yards</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <DollarSign className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            Net 30
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Standard Terms</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Primary AR credit window</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {facilities.filter((f) => f.facilityType === "terminal" || f.facilityType === "yard").length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Carrier Terminals</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Operational cross-docks & yards</p>
        </Card>
      </div>

      {/* ─── DIRECTORY TABLE & TABS ─── */}
      <CustomersDirectoryView customers={customers} facilities={facilities} />
    </div>
  )
}
