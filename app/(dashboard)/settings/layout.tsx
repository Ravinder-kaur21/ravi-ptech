import { redirect } from "next/navigation"
import { getSession, getOrganizationById } from "@/lib/dal"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")
  await getOrganizationById(tenantId)

  // No chrome wrapper — the Settings page itself owns its layout.
  // The main dashboard sidebar (set in the parent (dashboard) layout)
  // is the only navigation; this matches Notion / GitHub / Stripe
  // where Settings is a content surface, not a separate app.
  return <>{children}</>
}

export const instant = false
