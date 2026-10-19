import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { UserProfileClient } from "@/components/settings/user-profile-client"

export default async function UserProfilePage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <UserProfileClient />
}

export const instant = false
