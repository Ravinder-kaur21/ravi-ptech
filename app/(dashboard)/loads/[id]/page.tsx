import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Truck, MapPin, Calendar, DollarSign, User } from "lucide-react"
import { getSession, getLoadById, getWorkspaceProfile } from "@/lib/dal"
import { formatWorkspaceDate } from "@/lib/timezone"
import { Card } from "@/components/ui/card"
import { StarButton } from "@/components/load-star-button"
import { StatusBadge } from "@/components/status-badge"

export const instant = false

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const { id } = await params
  const load = await getLoadById(id, tenantId)
  if (!load) notFound()

  const profile = await getWorkspaceProfile(tenantId)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <Link
        href="/loads"
        className="inline-flex items-center gap-1 text-[13px] text-brand-muted-soft hover:text-brand-ink transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Back to loads
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              {load.loadNumber}
            </h1>
            <StatusBadge status={load.status} />
          </div>
          <p className="mt-1 text-sm text-brand-ink/80">
            {load.customerName || "No customer"} · Created{" "}
            {formatWorkspaceDate(load.createdAt, profile?.timeZone)}
          </p>
        </div>
        <StarButton loadId={load.id} initial={load.isStarred ?? false} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-rule bg-brand-card p-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft mb-3">
            Route
          </h2>
          <div className="space-y-3">
            <RouteRow
              icon={MapPin}
              label="Origin"
              value={
                load.originCity
                  ? `${load.originCity}${load.originState ? `, ${load.originState}` : ""}`
                  : "—"
              }
              sub={load.originAddress ?? null}
            />
            <RouteRow
              icon={MapPin}
              label="Destination"
              value={
                load.destCity
                  ? `${load.destCity}${load.destState ? `, ${load.destState}` : ""}`
                  : "—"
              }
              sub={load.destAddress ?? null}
            />
          </div>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft mb-3">
            Details
          </h2>
          <div className="space-y-3">
            <DetailRow
              icon={Truck}
              label="Load type"
              value={load.loadType || "—"}
            />
            <DetailRow
              icon={Calendar}
              label="Pickup"
              value={load.pickupDate ? formatWorkspaceDate(load.pickupDate, profile?.timeZone, undefined, { mode: "date" }) : "—"}
            />
            <DetailRow
              icon={Calendar}
              label="Delivery"
              value={load.deliveryDate ? formatWorkspaceDate(load.deliveryDate, profile?.timeZone, undefined, { mode: "date" }) : "—"}
            />
            <DetailRow
              icon={DollarSign}
              label="Rate"
              value={load.rate ? `$${load.rate}` : "—"}
            />
            <DetailRow
              icon={User}
              label="Customer"
              value={load.customerName || "—"}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

function RouteRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any
  label: string
  value: string
  sub: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </p>
        <p className="text-sm font-medium text-brand-ink">{value}</p>
        {sub && <p className="text-xs text-brand-muted-soft mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-brand-muted-soft">
        <Icon className="size-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-medium text-brand-ink text-right">{value}</span>
    </div>
  )
}
