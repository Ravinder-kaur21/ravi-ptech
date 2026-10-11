import { Users } from "lucide-react"
import { getAdminStats } from "@/lib/dal"
import { UsersTable } from "@/components/admin/users-table"

export const instant = false

export default async function AdminUsersPage() {
  console.log("[ADMIN/USERS] rendering")
  const stats = await getAdminStats()

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            USERS
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · {stats.totalUsers.toLocaleString()} total ·{" "}
            {stats.bannedUsers} banned · {stats.suspendedUsers} suspended
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Users</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          Search, ban, impersonate, change role, or delete any account. Use
          impersonation to debug what a user is actually seeing — it never
          affects their data unless you change it.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <UsersTable />
      </div>
    </>
  )
}
