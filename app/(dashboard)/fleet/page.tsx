import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"

export default async function FleetPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (!perms.has("fleet.module")) {
    redirect("/")
  }

  const canCreate = perms.has("fleet.create")

  return (
    <ModulePage
      title="Fleet"
      description="Manage your trucks, trailers, and equipment in one place."
      icon={Users}
      primaryAction={canCreate ? { label: "Add truck", href: "/fleet/new" } : undefined}
      emptyStateTitle="No trucks yet"
      emptyStateDescription="Add your trucks and trailers to start dispatching. You can add them one at a time or import in bulk."
      nextSteps={[
        { label: "Add trailer", href: "/fleet/trailers/new", description: "Track trailers separately" },
        { label: "Import from FMCSA", href: "/settings/import", description: "Auto-import carrier data" },
      ]}
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
