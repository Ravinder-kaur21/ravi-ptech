import { redirect } from "next/navigation"

export default async function RoleRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/settings/roles/${encodeURIComponent(id)}`)
}

export const instant = false
