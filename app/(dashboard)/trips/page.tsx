import Link from "next/link"
import { redirect } from "next/navigation"
import { Map, ArrowUpRight, Truck, User, Navigation, Phone, ExternalLink } from "lucide-react"
import { getSession, getTripsWithDetailsForOrg, getDriversForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { TripStatusUpdater } from "@/components/tms/trip-status-updater"
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
        <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/60">
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Trip #
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Load
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Route & Nav
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Driver
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Equipment
                  </th>
                  <th className="text-left font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Status
                  </th>
                  <th className="text-right font-mono text-[10px] font-semibold uppercase tracking-wider px-5 py-3 text-[#8a8b8f]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
                {trips.map((t) => {
                  const mapUrl =
                    t.originCity && t.destCity
                      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                          `${t.originCity}, ${t.originState}`
                        )}&destination=${encodeURIComponent(`${t.destCity}, ${t.destState}`)}`
                      : null

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#f7f3ec]/50 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                        {t.tripNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        {t.loadId ? (
                          <Link
                            href={`/loads/${t.loadId}`}
                            className="font-mono text-xs text-[#d9622b] hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            {t.loadNumber || "View Load"}
                            <ArrowUpRight className="size-3" />
                          </Link>
                        ) : (
                          <span className="text-[#8a8b8f] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#16181d] dark:text-zinc-200">
                        <div className="flex items-center gap-1.5">
                          <span>
                            {t.originCity ? `${t.originCity}, ${t.originState}` : "—"}{" "}
                            <span className="text-[#8a8b8f]">→</span>{" "}
                            {t.destCity ? `${t.destCity}, ${t.destState}` : "—"}
                          </span>
                          {mapUrl && (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open route in Google Maps"
                              className="text-[#8a8b8f] hover:text-[#d9622b] transition-colors"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {t.driverFirstName ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-medium text-[#16181d] dark:text-zinc-100">
                              <User className="size-3.5 text-[#8a8b8f] shrink-0" />
                              <span>
                                {t.driverFirstName} {t.driverLastName}
                              </span>
                            </div>
                            {t.driverPhone && (
                              <a
                                href={`tel:${t.driverPhone}`}
                                className="inline-flex items-center gap-1 font-mono text-[10px] text-[#d9622b] hover:underline"
                              >
                                <Phone className="size-2.5" />
                                <span>{t.driverPhone}</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#8a8b8f] text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                          <span className="text-[#16181d] dark:text-zinc-100">
                            Power: {t.truckUnitNumber ? `#${t.truckUnitNumber}` : "—"}
                          </span>
                          {t.trailerUnitNumber && (
                            <span className="text-[#8a8b8f]">
                              TLR: #{t.trailerUnitNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TripStatusUpdater tripId={t.id} currentStatus={t.status} />
                          <RecordExpenseDialog
                            trips={tripOptions}
                            defaultTripId={t.id}
                            drivers={drivers}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
