import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { BillingClient } from "@/components/settings/billing-client"

export default async function BillingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <BillingClient />
}

export const instant = false
