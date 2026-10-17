import Link from "next/link"
import { redirect } from "next/navigation"
import { Map, ArrowUpRight, Truck, User, Navigation } from "lucide-react"
import { getSession, getTripsWithDetailsForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { TripStatusUpdater } from "@/components/tms/trip-status-updater"

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

  const trips = await getTripsWithDetailsForOrg(tenantId)
  const activeTrips = trips.filter((t) => t.status === "in_progress" || t.status === "pending")
  const completedTrips = trips.filter((t) => t.status === "completed")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Active <span className="italic text-brand-accent">Trips</span>
          </h1>
          <p className="mt-1 text-sm text-brand-ink/80">
            {trips.length} {trips.length === 1 ? "trip" : "trips"} total · {activeTrips.length} in transit
          </p>
        </div>
        <Link
          href="/loads"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-brand-rule text-xs font-medium text-brand-ink hover:bg-brand-cream-soft transition-colors"
        >
          <Truck className="size-3.5 text-brand-accent" />
          View Loads to Dispatch
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Active In-Transit</p>
            <Navigation className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{activeTrips.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Delivered / Completed</p>
            <Truck className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{completedTrips.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4 col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Total Dispatched Runs</p>
            <Map className="size-4 text-brand-muted-soft" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{trips.length}</p>
        </Card>
      </div>

      {/* Trips Table */}
      {trips.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
            <Map className="h-5 w-5 text-brand-accent" />
          </div>
          <p className="font-medium text-brand-ink">No trips dispatched yet</p>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Trips are automatically created when a load is dispatched with an assigned driver and power unit.
          </p>
          <Link
            href="/loads"
            className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-xs font-medium"
          >
            Go to loads to dispatch
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Card>
      ) : (
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-rule bg-brand-cream-soft/50">
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Trip #
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Load
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Route
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Driver
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Equipment
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Status
                  </th>
                  <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-brand-rule last:border-0 hover:bg-brand-cream-soft/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-ink">
                      {t.tripNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      {t.loadId ? (
                        <Link
                          href={`/loads/${t.loadId}`}
                          className="font-mono text-xs text-brand-accent hover:underline inline-flex items-center gap-1"
                        >
                          {t.loadNumber || "View Load"}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-brand-muted-soft text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-brand-ink">
                      {t.originCity ? `${t.originCity}, ${t.originState}` : "—"}{" "}
                      <span className="text-brand-muted-soft">→</span>{" "}
                      {t.destCity ? `${t.destCity}, ${t.destState}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {t.driverFirstName ? (
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-brand-muted-soft shrink-0" />
                          <span className="font-medium text-brand-ink">
                            {t.driverFirstName} {t.driverLastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-brand-muted-soft text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-brand-ink">
                          Tractor: {t.truckUnitNumber || "—"}
                        </span>
                        {t.trailerUnitNumber && (
                          <span className="font-mono text-[11px] text-brand-muted-soft">
                            Trailer: {t.trailerUnitNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <TripStatusUpdater tripId={t.id} currentStatus={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
