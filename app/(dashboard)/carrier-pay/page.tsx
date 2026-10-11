import { redirect } from "next/navigation"
import { Banknote } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function CarrierPayPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Carrier Pay"
      description="Pay your owner-operators and contracted carriers."
      icon={Banknote}
      emptyStateTitle="No carrier payments yet"
      emptyStateDescription="Pay owner-operators and contracted carriers based on completed trips."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
