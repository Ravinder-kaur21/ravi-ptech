import { redirect } from "next/navigation"
import { Truck, Box, CheckCircle2, AlertTriangle, MapPin } from "lucide-react"
import { getSession, getTrucksForOrg, getTrailersForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/status-badge"
import { AddTruckDialog } from "@/components/tms/add-truck-dialog"
import { AddTrailerDialog } from "@/components/tms/add-trailer-dialog"

export const instant = false

export default async function FleetPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (!perms.has("fleet.module")) {
    redirect("/")
  }

  const [trucks, trailers] = await Promise.all([
    getTrucksForOrg(tenantId),
    getTrailersForOrg(tenantId),
  ])

  const availableTrucks = trucks.filter((t) => t.status === "available")
  const inUseTrucks = trucks.filter((t) => t.status === "in_use")
  const canCreate = perms.has("fleet.create")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Fleet & <span className="italic text-brand-accent">Equipment</span>
          </h1>
          <p className="mt-1 text-sm text-brand-ink/80">
            {trucks.length} tractors · {trailers.length} trailers · {availableTrucks.length} available for dispatch
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <AddTrailerDialog />
            <AddTruckDialog />
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Total Tractors</p>
            <Truck className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{trucks.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Available Units</p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{availableTrucks.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Dispatched / In-Use</p>
            <Truck className="size-4 text-brand-muted-soft" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{inUseTrucks.length}</p>
        </Card>
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-brand-muted-soft">Trailers in Fleet</p>
            <Box className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{trailers.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trucks" className="space-y-4">
        <TabsList className="bg-brand-cream-soft border border-brand-rule">
          <TabsTrigger value="trucks" className="text-xs">
            Tractors / Power Units ({trucks.length})
          </TabsTrigger>
          <TabsTrigger value="trailers" className="text-xs">
            Trailers ({trailers.length})
          </TabsTrigger>
        </TabsList>

        {/* Trucks Tab */}
        <TabsContent value="trucks">
          {trucks.length === 0 ? (
            <Card className="border-brand-rule bg-brand-card p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
                <Truck className="h-5 w-5 text-brand-accent" />
              </div>
              <p className="font-medium text-brand-ink">No power units in fleet</p>
              <p className="mt-1 text-sm text-brand-muted-soft">
                Add your tractors to track locations, assignments, and service schedules.
              </p>
              {canCreate && (
                <div className="mt-4 inline-block">
                  <AddTruckDialog />
                </div>
              )}
            </Card>
          ) : (
            <Card className="border-brand-rule bg-brand-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-rule bg-brand-cream-soft/50">
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Unit #
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Vehicle
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        VIN / Plate
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Location
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Odometer
                      </th>
                      <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trucks.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-brand-rule last:border-0 hover:bg-brand-cream-soft/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-ink">
                          {t.unitNumber}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-brand-ink">
                          {t.year ? `${t.year} ` : ""}
                          {t.make || "Power Unit"} {t.model || ""}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono">
                          <div>{t.vin || "—"}</div>
                          {t.licensePlate && (
                            <div className="text-[11px] text-brand-muted-soft">
                              Plate: {t.licensePlate} ({t.licenseState || "—"})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {t.currentLocation ? (
                            <div className="flex items-center gap-1 text-brand-ink">
                              <MapPin className="size-3.5 text-brand-accent shrink-0" />
                              <span>{t.currentLocation}</span>
                            </div>
                          ) : (
                            <span className="text-brand-muted-soft">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-brand-ink">
                          {t.currentMiles ? `${t.currentMiles} mi` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Trailers Tab */}
        <TabsContent value="trailers">
          {trailers.length === 0 ? (
            <Card className="border-brand-rule bg-brand-card p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
                <Box className="h-5 w-5 text-brand-accent" />
              </div>
              <p className="font-medium text-brand-ink">No trailers registered yet</p>
              <p className="mt-1 text-sm text-brand-muted-soft">
                Register dry vans, reefers, or flatbeds to pair with your loads.
              </p>
              {canCreate && (
                <div className="mt-4 inline-block">
                  <AddTrailerDialog />
                </div>
              )}
            </Card>
          ) : (
            <Card className="border-brand-rule bg-brand-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-rule bg-brand-cream-soft/50">
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Unit #
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Equipment Type
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Make / Model
                      </th>
                      <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Plate / State
                      </th>
                      <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trailers.map((tr) => (
                      <tr
                        key={tr.id}
                        className="border-b border-brand-rule last:border-0 hover:bg-brand-cream-soft/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-brand-ink">
                          {tr.unitNumber}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-brand-ink">
                          {tr.type || "Dry Van"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-brand-ink">
                          {tr.year ? `${tr.year} ` : ""}
                          {tr.make || "—"} {tr.model || ""}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono">
                          {tr.licensePlate ? `${tr.licensePlate} (${tr.licenseState || "—"})` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <StatusBadge status={tr.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
