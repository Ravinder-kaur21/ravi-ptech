import { redirect } from "next/navigation"
import {
  getSession,
  getCarrierPaymentsWithDetailsForOrg,
  getCarriersForOrg,
  getTripsWithDetailsForOrg,
  getWorkspaceProfile,
} from "@/lib/dal"
import { CarrierPayClient } from "@/components/tms/carrier-pay-client"

export const instant = false

export default async function CarrierPayPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [payments, carriers, trips, profile] = await Promise.all([
    getCarrierPaymentsWithDetailsForOrg(tenantId),
    getCarriersForOrg(tenantId),
    getTripsWithDetailsForOrg(tenantId),
    getWorkspaceProfile(tenantId),
  ])

  const formattedTrips = trips.map((t) => ({
    id: t.id,
    tripNumber: t.tripNumber,
    loadNumber: t.loadNumber,
  }))

  const userTimeZone = profile?.timeZone || "UTC"

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── HEADER ─── */}
      <div>
        <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
          Carrier Pay & Settlements
        </h1>
        <p className="mt-1 text-sm text-brand-muted-soft">
          Manage outside carrier settlements, rate pay, and remittance records.
        </p>
      </div>

      <CarrierPayClient
        payments={payments}
        carriers={carriers}
        trips={formattedTrips}
        userTimeZone={userTimeZone}
      />
    </div>
  )
}
