import { redirect } from "next/navigation"
import { Map } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"

export default async function TripsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (!perms.has("loads.module") && !perms.has("loads.view_assigned") && !perms.has("loads.view_all") && !perms.has("loads.view_own")) {
    redirect("/")
  }

  return (
    <ModulePage
      title="Trips"
      description="Active and completed trips with live tracking and BOL management."
      icon={Map}
      emptyStateTitle="No trips yet"
      emptyStateDescription="Trips are created when a load is dispatched. Assign a driver, truck, and trailer to your first load to get started."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
