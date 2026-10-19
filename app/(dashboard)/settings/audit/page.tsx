import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { WorkspaceAuditClient } from "@/components/settings/workspace-audit-client"

export default async function WorkspaceAuditPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return <WorkspaceAuditClient />
}

export const instant = false
