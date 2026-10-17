import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Star, Truck, ArrowUpRight } from "lucide-react"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">Active in Transit</p>
            <Truck className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-blue-600">{activeCount}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">En route or dispatched</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">Ready for Booking</p>
            <Plus className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">{availableCount}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Available for assignment</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">Delivered Loads</p>
            <Truck className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-serif text-2xl text-emerald-600">{deliveredCount}</p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Completed freight runs</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-muted-soft">Pipeline Value</p>
            <span className="font-mono text-xs text-brand-accent font-semibold">$</span>
          </div>
          <p className="mt-2 font-serif text-2xl text-brand-ink">
            ${pipelineSum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-brand-muted-soft mt-0.5">Total gross freight revenue</p>
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
