import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"

export default async function DriversPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")



  return (
    <div>
      this is ai page
    </div>
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
