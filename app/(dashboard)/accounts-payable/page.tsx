import { redirect } from "next/navigation"
import { Receipt } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function AccountsPayablePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Accounts Payable"
      description="Fuel, tolls, lumper fees, and other trip expenses."
      icon={Receipt}
      emptyStateTitle="No expenses yet"
      emptyStateDescription="Track expenses per trip. Drivers can submit receipts from the mobile app."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
