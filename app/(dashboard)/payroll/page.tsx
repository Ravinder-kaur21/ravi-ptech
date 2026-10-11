import { redirect } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function PayrollPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Payroll"
      description="Pay your W-2 drivers — by mile, percentage, or flat rate."
      icon={ClipboardList}
      emptyStateTitle="No pay stubs yet"
      emptyStateDescription="Generate pay stubs for your drivers based on their completed trips. Drivers see their own pay in the mobile app."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
