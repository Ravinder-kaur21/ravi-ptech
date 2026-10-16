import { redirect } from "next/navigation"
import { getSession, getOrganizationById } from "@/lib/dal"
import { SettingsIndexClient } from "@/components/settings/settings-index-client"

export default async function SettingsIndexPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")
  const org = await getOrganizationById(tenantId)
  if (!org) redirect("/onboarding")

  return (
    <SettingsIndexClient
      workspaceName={org.name}
      workspaceSlug={org.slug}
    />
  )
}

export const instant = false
