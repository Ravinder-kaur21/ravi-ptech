import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { MembersClient } from "@/components/settings/members-client"

export default async function TeamSettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <MembersClient />
}

export const instant = false
