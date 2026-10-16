import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Star, Truck, ArrowUpRight } from "lucide-react"
import { getSession, getLoadsForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"

export const instant = false

export default async function LoadsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [loads, perms] = await Promise.all([
    getLoadsForOrg(tenantId),
    getEffectivePermissions(session.user.id, tenantId),
  ])

  const canCreate = perms.has("loads.create")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Loads</span>
          </h1>
          <p className="mt-1 text-sm text-brand-ink/80">
            {loads.length} {loads.length === 1 ? "load" : "loads"} · {loads.filter((l) => l.status !== "delivered" && l.status !== "completed" && l.status !== "cancelled").length} active
          </p>
        </div>
        {canCreate && (
          <Button
            render={<Link href="/loads/new" />}
            className="h-10 gap-1.5 rounded-full bg-brand-ink px-5 text-sm font-medium text-brand-cream hover:bg-brand-ink-soft"
          >
            <Plus className="h-4 w-4" />
            New load
          </Button>
        )}
      </div>

      {loads.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
            <Truck className="h-5 w-5 text-brand-accent" />
          </div>
          <p className="font-medium text-brand-ink">No loads yet</p>
          <p className="mt-1 text-sm text-brand-muted-soft">
            {canCreate
              ? "Create your first load to start dispatching."
              : "No loads have been dispatched to this workspace yet."}
          </p>
          {canCreate && (
            <Button
              render={<Link href="/loads/new" />}
              className="mt-4 h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create your first load
            </Button>
          )}
        </Card>
      ) : (
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-rule bg-brand-cream-soft/50">
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft w-8" />
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Load
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Customer
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Route
                  </th>
                  <th className="text-left font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Status
                  </th>
                  <th className="text-right font-mono text-[10px] font-medium uppercase tracking-[0.04em] px-5 py-3 text-brand-muted-soft">
                    Rate
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {loads.map((l: any) => (
                  <tr
                    key={l.id}
                    className="border-b border-brand-rule last:border-0 hover:bg-brand-cream-soft/50"
                  >
                    <td className="px-5 py-3">
                      {l.isStarred && (
                        <Star className="size-3.5 text-brand-accent fill-brand-accent" />
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-[13px] text-brand-ink">
                      <Link href={`/loads/${l.id}`} className="hover:underline">
                        {l.loadNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-brand-ink/80">
                      {l.customerName || "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-ink/80">
                      {l.originCity && l.destCity
                        ? `${l.originCity}, ${l.originState} → ${l.destCity}, ${l.destState}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[13px] text-brand-ink">
                      {l.rate ? `$${l.rate}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/loads/${l.id}`}
                        className="text-brand-muted-soft hover:text-brand-ink"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
