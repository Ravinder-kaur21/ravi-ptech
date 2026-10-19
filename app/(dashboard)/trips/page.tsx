import Link from "next/link"
import { redirect } from "next/navigation"
import { Map, ArrowUpRight, Truck, User, Navigation, Phone, ExternalLink, Clock, CheckCircle2 } from "lucide-react"
import { getSession, getTripsWithDetailsForOrg, getDriversForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { TripsTableView } from "@/components/tms/trips-table-view"
import { RecordExpenseDialog } from "@/components/tms/record-expense-dialog"

export const instant = false

export default async function TripsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (
    !perms.has("loads.module") &&
    !perms.has("loads.view_assigned") &&
    !perms.has("loads.view_all") &&
    !perms.has("loads.view_own")
  ) {
    redirect("/")
  }

  const [trips, drivers] = await Promise.all([
    getTripsWithDetailsForOrg(tenantId),
    getDriversForOrg(tenantId),
  ])

  const activeTrips = trips.filter((t) => t.status === "in_progress")
  const assignedTrips = trips.filter((t) => t.status === "pending" || t.status === "assigned" || t.status === "dispatched")
  const completedTrips = trips.filter((t) => t.status === "completed")

  const tripOptions = trips.map((t) => ({
    id: t.id,
    tripNumber: t.tripNumber,
    loadNumber: t.loadNumber,
  }))

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Active <span className="italic text-[#d9622b]">Trips</span>
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            {trips.length} {trips.length === 1 ? "trip" : "trips"} total · {activeTrips.length} rolling on highway
          </p>
        </div>
        <div className="flex items-center gap-2 ">
          {trips.length > 0 && (
            <RecordExpenseDialog
              trips={tripOptions}
              drivers={drivers}
            />
          )}
          <Link
            href="/loads"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-brand-rule text-xs font-medium text-brand-ink hover:bg-brand-cream-soft transition-colors shadow-2xs"
          >
            <Truck className="size-3.5 text-[#d9622b]" />
            Loads to Dispatch
          </Link>
        </div>
      </div>

      {/* KPI Cards matching Dashboard Design Language */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Navigation className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">{activeTrips.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active In-Transit</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Rolling live on highway</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Clock className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{assignedTrips.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Dispatched / Loading</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Assigned awaiting pickup</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">{completedTrips.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Delivered & Complete</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">POD confirmed delivered</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Map className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{trips.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Total Fleet Runs</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Dispatched cross-country trips</p>
        </Card>
      </div>

      {/* Trips Table */}
      {trips.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-12 text-center shadow-xs">
          <div className="mx-auto size-12 rounded-full bg-brand-accent-tint text-brand-accent flex items-center justify-center mb-4">
            <Map className="size-5" />
          </div>
          <p className="font-serif text-xl tracking-tight text-brand-ink font-semibold">No trips dispatched yet</p>
          <p className="mt-1 text-sm text-brand-muted-soft max-w-md mx-auto">
            Trips are automatically created when a load is dispatched with an assigned driver and power unit.
          </p>
          <Link
            href="/loads"
            className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-hover text-brand-cream text-xs font-medium transition-colors"
          >
            Go to loads to dispatch
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Card>
      ) : (
        <TripsTableView trips={trips} drivers={drivers} />
      )}
    </div>
  )
}
