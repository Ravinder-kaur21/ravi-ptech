import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function DriversPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Drivers"
      description="Your team behind the wheel — pay, compliance, and assignments."
      icon={Users}
      primaryAction={{ label: "Invite driver", href: "/drivers/new" }}
      emptyStateTitle="No drivers yet"
      emptyStateDescription="Invite your drivers to Muvx. They'll get a code to sign up and access their assigned loads and pay info."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
