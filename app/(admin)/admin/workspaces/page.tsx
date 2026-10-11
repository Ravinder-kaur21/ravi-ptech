import { Building2 } from "lucide-react"
import { getAdminStats } from "@/lib/dal"
import { WorkspacesTable } from "@/components/admin/workspaces-table"

export const instant = false

export default async function AdminWorkspacesPage() {
  console.log("[ADMIN/WORKSPACES] rendering")
  const stats = await getAdminStats()

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-[1400px]">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="size-[7px] shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            WORKSPACES
          </span>
          <span className="font-mono text-[11px] tracking-[0.04em] text-brand-muted-soft">
            · {stats.totalOrgs.toLocaleString()} ORGS · {stats.totalMembers.toLocaleString()} MEMBERS
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Building2 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Workspaces</span>
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-brand-ink/80">
          Every organization across every tenant. Use this to clean up test
          workspaces, audit active tenants, or delete a workspace whose owner
          has left the company.
        </p>
      </div>

      <WorkspacesTable />
    </div>
  )
}