import { InviteClient } from "@/components/invite/invite-client"

interface PageProps {
  params: Promise<{ invitationId: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { invitationId } = await params
  return <InviteClient invitationId={invitationId} />
}

// Reads invitationId from params — opt out of static prerendering.
export const instant = false
