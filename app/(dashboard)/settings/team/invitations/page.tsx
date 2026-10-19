import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { InvitationsClient } from "@/components/settings/invitations-client"

export default async function TeamInvitationsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <InvitationsClient />
}

// Session-dependent — opt out of static prerendering.
export const instant = false