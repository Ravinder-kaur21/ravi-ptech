import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { RolesMasterClient } from "@/components/settings/roles-master-client"

export default async function RolesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")
  return <RolesMasterClient />
}

export const instant = false
