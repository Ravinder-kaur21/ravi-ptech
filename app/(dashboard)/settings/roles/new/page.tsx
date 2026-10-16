import { redirect } from "next/navigation"

export default function NewRoleRedirect() {
  redirect("/settings/roles")
}
