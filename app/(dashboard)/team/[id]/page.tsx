import { redirect } from "next/navigation"

export default async function TeamMemberRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/settings/team/${encodeURIComponent(id)}`)
}

export const instant = false
