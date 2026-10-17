import Link from "next/link"
import { redirect } from "next/navigation"
import { Map, ArrowUpRight, Truck, User, Navigation, Phone, ExternalLink } from "lucide-react"
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

  const activeTrips = trips.filter((t) => t.status === "in_progress" || t.status === "pending")
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
        <div className="flex items-center gap-2">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">Active In-Transit</p>
            <Navigation className="size-4 text-[#d9622b]" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-[#16181d] dark:text-zinc-100">{activeTrips.length}</p>
        </Card>
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">Delivered / Completed</p>
            <Truck className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-emerald-600">{completedTrips.length}</p>
        </Card>
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 col-span-2 lg:col-span-1 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">Total Dispatched Runs</p>
            <Map className="size-4 text-[#8a8b8f]" />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-[#16181d] dark:text-zinc-100">{trips.length}</p>
        </Card>
      </div>

      {/* Trips Table */}
      {trips.length === 0 ? (
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-12 text-center shadow-xs">
          <div className="mx-auto size-12 rounded-full bg-[#fff0e6] dark:bg-orange-950/40 text-[#d9622b] flex items-center justify-center mb-4">
            <Map className="size-5 text-[#d9622b]" />
          </div>
          <p className="font-medium text-[#16181d] dark:text-zinc-100">No trips dispatched yet</p>
          <p className="mt-1 text-sm text-[#73757a]">
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
