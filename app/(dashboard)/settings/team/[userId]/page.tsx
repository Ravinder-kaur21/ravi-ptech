import { redirect } from "next/navigation"
import { getSession } from "@/lib/dal"
import { MemberDetailClient } from "@/components/settings/member-detail-client"

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const { userId } = await params
  return <MemberDetailClient userId={userId} />
}

export const instant = false
