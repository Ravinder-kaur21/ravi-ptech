import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { TeamSettingsClient } from "@/components/settings/team-client"

export default async function TeamSettingsPage() {
  // Server guard: must have a session AND an active org.
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <TeamSettingsClient />
}

// Session-dependent — opt out of static prerendering.
export const instant = false
