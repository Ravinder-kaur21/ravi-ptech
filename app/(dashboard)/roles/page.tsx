import { redirect } from "next/navigation"

export default function RolesRedirectPage() {
  redirect("/settings/roles")
}

export const instant = false
