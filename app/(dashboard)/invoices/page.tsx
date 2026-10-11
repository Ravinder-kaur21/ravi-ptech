import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { ModulePage } from "@/components/dashboard/module-page"
import { getSession } from "@/lib/dal"

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <ModulePage
      title="Invoices"
      description="Bill customers and track payments from delivered loads."
      icon={FileText}
      primaryAction={{ label: "Create invoice", href: "/invoices/new" }}
      emptyStateTitle="No invoices yet"
      emptyStateDescription="Invoices are auto-generated when a load is delivered and the POD matches. You can also create custom invoices."
    />
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
