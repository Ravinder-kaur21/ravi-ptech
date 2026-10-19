import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Star, Truck, ArrowUpRight, DollarSign, CheckCircle2 } from "lucide-react"
import { getSession, getLoadsForOrg } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadsTableView } from "@/components/tms/loads-table-view"

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

  const activeCount = loads.filter((l) => l.status === "dispatched" || l.status === "in_transit").length
  const availableCount = loads.filter((l) => l.status === "available" || l.status === "booked").length
  const deliveredCount = loads.filter((l) => l.status === "delivered" || l.status === "completed").length
  const pipelineSum = loads.reduce((acc, l) => acc + (parseFloat(l.finalRate || l.rate || "0") || 0), 0)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Freight <span className="italic text-brand-accent">Loads</span>
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            {loads.length} {loads.length === 1 ? "load" : "loads"} on record · {activeCount} in transit across active routes
          </p>
        </div>
        {canCreate && (
          <Button
            render={<Link href="/loads/new" />}
            className="h-9 gap-1.5 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-soft"
          >
            <Plus className="h-4 w-4" />
            New load studio
          </Button>
        )}
      </div>

      {/* KPI Cards matching Dashboard Design Language */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Truck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{activeCount}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active In-Transit</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">En route or dispatched on road</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Plus className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">{availableCount}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Ready for Booking</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Tendered awaiting driver dispatch</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">{deliveredCount}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Delivered Loads</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Completed freight runs</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <DollarSign className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            ${pipelineSum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Pipeline Revenue</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Total gross freight billing</p>
        </Card>
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
        <LoadsTableView loads={loads} />
      )}
    </div>
  )
}
