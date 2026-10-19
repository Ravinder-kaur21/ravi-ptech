import { redirect } from "next/navigation"
import { getSession, getTrucksForOrg, getTrailersForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { AddTruckDialog } from "@/components/tms/add-truck-dialog"
import { AddTrailerDialog } from "@/components/tms/add-trailer-dialog"
import { FleetView, type TruckItem, type TrailerItem } from "@/components/tms/fleet-view"

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

  const [rawTrucks, rawTrailers] = await Promise.all([
    getTrucksForOrg(tenantId),
    getTrailersForOrg(tenantId),
  ])

  const canCreate = perms.has("fleet.create")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── STUDIO HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Fleet & <span className="italic text-[#d9622b]">Equipment</span>
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            Manage commercial tractors, trailers, VIN compliance, terminal locations, and dispatch readiness.
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <AddTrailerDialog />
            <AddTruckDialog />
          </div>
        )}
      </div>

      {/* ─── INTERACTIVE BENTO FLEET VIEW ─── */}
      <FleetView
        trucks={rawTrucks as TruckItem[]}
        trailers={rawTrailers as TrailerItem[]}
        canCreate={canCreate}
      />
    </div>
  )
}
