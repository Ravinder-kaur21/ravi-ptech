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

      {/* ─── DIRECTORY TABLE & TABS ─── */}
      <CustomersDirectoryView customers={customers} facilities={facilities} />
    </div>
  )
}
