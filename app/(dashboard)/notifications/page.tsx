import { redirect } from "next/navigation"
import { Bell } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Notifications"
      description="Real-time alerts for your fleet, loads, drivers, and billing."
      icon={Bell}
      emptyStateTitle="No notifications yet"
      emptyStateDescription="When something needs your attention — a new load assignment, an expiring CDL, an overdue invoice — it shows up here."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
