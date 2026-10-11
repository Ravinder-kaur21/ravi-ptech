import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { WorkspaceSettingsClient } from "@/components/settings/workspace-client"

export default async function WorkspaceSettingsPage() {
  // Server guard: must have a session AND an active org before the client
  // tries to fetch org details (avoids a flash of empty state).
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <WorkspaceSettingsClient />
}

// Session-dependent — opt out of static prerendering.
export const instant = false
