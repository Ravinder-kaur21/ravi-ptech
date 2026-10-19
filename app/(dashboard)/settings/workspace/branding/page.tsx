import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { BrandingClient } from "@/components/settings/branding-client"

export default async function BrandingPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")
  return <BrandingClient />
}

export const instant = false
