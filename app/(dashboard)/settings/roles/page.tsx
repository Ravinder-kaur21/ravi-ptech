import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { RolesClient } from "@/components/settings/roles-client"

export default async function RolesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")
  return <RolesClient />
}

export const instant = false
