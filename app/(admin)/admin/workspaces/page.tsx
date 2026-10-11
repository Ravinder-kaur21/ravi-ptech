import { Building2 } from "lucide-react"
import { getAdminStats } from "@/lib/dal"
import { WorkspacesTable } from "@/components/admin/workspaces-table"

export const instant = false

export default async function AdminWorkspacesPage() {
  console.log("[ADMIN/WORKSPACES] rendering")
  const stats = await getAdminStats()

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            WORKSPACES
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · {stats.totalOrgs.toLocaleString()} orgs ·{" "}
            {stats.totalMembers.toLocaleString()} members
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Workspaces</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          Every organization across every tenant. Use this to clean up test
          workspaces, audit active tenants, or delete a workspace whose owner
          has left the company.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <WorkspacesTable />
      </div>
    </>
  )
}
