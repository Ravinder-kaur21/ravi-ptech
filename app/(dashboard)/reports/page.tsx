import { redirect } from "next/navigation"
import { TrendingUp } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function ReportsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Reports"
      description="Profit per load, lane performance, and on-time delivery metrics."
      icon={TrendingUp}
      emptyStateTitle="No reports yet"
      emptyStateDescription="Once you have loads, trips, and expenses, we'll generate profit analysis and performance reports here."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
