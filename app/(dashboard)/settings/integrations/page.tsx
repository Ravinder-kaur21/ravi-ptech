import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { IntegrationsClient } from "@/components/settings/integrations-client"

export default async function IntegrationsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <IntegrationsClient />
}

export const instant = false
