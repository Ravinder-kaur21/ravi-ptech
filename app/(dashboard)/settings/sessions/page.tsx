import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { SessionsClient } from "@/components/settings/sessions-client"

export default async function SessionsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <SessionsClient />
}

export const instant = false
