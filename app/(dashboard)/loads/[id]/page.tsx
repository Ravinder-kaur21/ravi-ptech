import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Navigation,
  ArrowUpRight,
  Thermometer,
  FileText,
  Printer,
  Clock,
  Phone,
} from "lucide-react"
import {
  getSession,
  getLoadById,
  getWorkspaceProfile,
  getDriversForOrg,
  getTrucksForOrg,
  getTrailersForOrg,
} from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { formatWorkspaceDate } from "@/lib/timezone"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarButton } from "@/components/load-star-button"
import { StatusBadge } from "@/components/status-badge"
import { DispatchLoadDialog } from "@/components/tms/dispatch-load-dialog"
import type { LoadStop } from "@/lib/tms-tax"

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
  const [load, profile, perms, drivers, trucks, trailers] = await Promise.all([
    getLoadById(id, tenantId),
    getWorkspaceProfile(tenantId),
    getEffectivePermissions(session.user.id, tenantId),
    getDriversForOrg(tenantId),
    getTrucksForOrg(tenantId),
    getTrailersForOrg(tenantId),
  ])

  if (!load) notFound()

  // Parse multi-stop route if present
  let stops: LoadStop[] = []
  if (load.stops) {
    try {
      stops = JSON.parse(load.stops)
    } catch (e) {
      console.warn("Failed to parse load stops JSON:", e)
    }
  }

  const canDispatch = perms.has("loads.dispatch") && load.status === "available"

  const isDispatched =
    load.status === "dispatched" ||
    load.status === "in_transit" ||
    load.status === "delivered"

  const currencySymbol = load.currency === "CAD" ? "C$" : "$"

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <Link
        href="/loads"
        className="inline-flex items-center gap-1 text-[13px] text-brand-muted-soft hover:text-brand-ink transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Back to loads
      </Link>

      {/* ─── HEADER & ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              {load.loadNumber}
            </h1>
            <StatusBadge status={load.status} />
            {load.loadType && (
              <Badge variant="outline" className="text-xs font-mono">
                {load.loadType}
              </Badge>
            )}
            {load.currency && (
              <Badge variant="secondary" className="text-xs font-mono">
                {load.currency}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-ink/80">
            {load.customerName || "No customer assigned"}
            {load.tenderNumber ? ` · Ref: ${load.tenderNumber}` : ""}
            {" · Created "}
            {formatWorkspaceDate(load.createdAt, profile?.timeZone)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Printable Documents */}
          <Link
            href={`/loads/${load.id}/bol`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-brand-rule text-xs font-medium text-brand-ink hover:bg-brand-cream-soft transition-colors"
          >
            <Printer className="size-3.5 text-brand-muted-soft" />
            Print BOL
          </Link>

          <Link
            href={`/loads/${load.id}/rate-con`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-brand-rule text-xs font-medium text-brand-ink hover:bg-brand-cream-soft transition-colors"
          >
            <FileText className="size-3.5 text-brand-muted-soft" />
            Rate Con
          </Link>

          {canDispatch && (
            <DispatchLoadDialog
              loadId={load.id}
              loadNumber={load.loadNumber}
              availableDrivers={drivers}
              availableTrucks={trucks}
              availableTrailers={trailers}
            />
          )}

          {isDispatched && (
            <Link
              href="/trips"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-brand-rule text-xs font-medium text-brand-ink hover:bg-brand-cream-soft transition-colors"
            >
              <Navigation className="size-3.5 text-brand-accent" />
              Track in Trips
              <ArrowUpRight className="size-3 text-brand-muted-soft" />
            </Link>
          )}

          <StarButton loadId={load.id} initial={load.isStarred ?? false} />
        </div>
      </div>

      {/* ─── ROUTE & STOPS TIMELINE ─── */}
      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="flex items-center justify-between border-b border-brand-rule/60 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-brand-accent" />
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-muted-soft">
              Route & Itinerary ({stops.length > 0 ? `${stops.length} Stops` : "Direct Route"})
            </h2>
          </div>
          {load.miles && (
            <span className="text-xs font-mono text-brand-muted-soft">
              {load.miles} Miles
            </span>
          )}
        </div>

        {stops.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-brand-rule">
            {stops.map((stop, index) => {
              const isPickup = stop.type === "pickup"
              return (
                <div key={stop.id || index} className="relative group">
                  <div
                    className={`absolute -left-6 top-1 size-5 rounded-full border-2 bg-white dark:bg-zinc-950 flex items-center justify-center ${
                      isPickup
                        ? "border-emerald-500 text-emerald-600"
                        : "border-blue-500 text-blue-600"
                    }`}
                  >
                    <span className="text-[9px] font-bold font-mono">
                      {index + 1}
                    </span>
                  </div>

                  <div className="rounded-lg border border-brand-rule bg-brand-cream/10 dark:bg-zinc-900/30 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isPickup
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-xs"
                          }
                        >
                          {isPickup ? "Pickup" : "Delivery"} #{index + 1}
                        </Badge>
                        <span className="font-medium text-sm text-brand-ink">
                          {stop.facilityName || `${stop.city}, ${stop.state}`}
                        </span>
                      </div>

                      {(stop.appointmentDate || stop.appointmentTime) && (
                        <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft font-mono">
                          <Clock className="size-3.5" />
                          <span>
                            {stop.appointmentDate} {stop.appointmentTime}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-brand-ink/80 space-y-1">
                      {stop.address && <p>{stop.address}</p>}
                      <p className="font-medium">
                        {stop.city}, {stop.state} {stop.zip}
                      </p>
                      {stop.contactPhone && (
                        <p className="flex items-center gap-1 text-brand-muted-soft pt-1">
                          <Phone className="size-3" />
                          {stop.contactName ? `${stop.contactName} · ` : ""}
                          {stop.contactPhone}
                        </p>
                      )}
                      {stop.notes && (
                        <p className="text-brand-muted-soft italic pt-1 border-t border-brand-rule/40 mt-2">
                          Note: {stop.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <RouteRow
              icon={MapPin}
              label="Origin (Pickup)"
              value={
                load.originCity
                  ? `${load.originCity}${load.originState ? `, ${load.originState}` : ""}`
                  : "—"
              }
              sub={load.originAddress ?? null}
              date={
                load.pickupDate
                  ? formatWorkspaceDate(load.pickupDate, profile?.timeZone, undefined, { mode: "date" })
                  : null
              }
            />
            <RouteRow
              icon={MapPin}
              label="Destination (Delivery)"
              value={
                load.destCity
                  ? `${load.destCity}${load.destState ? `, ${load.destState}` : ""}`
                  : "—"
              }
              sub={load.destAddress ?? null}
              date={
                load.deliveryDate
                  ? formatWorkspaceDate(load.deliveryDate, profile?.timeZone, undefined, { mode: "date" })
                  : null
              }
            />
          </div>
        )}
      </Card>

      {/* ─── LOAD SPECS & FINANCIALS ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Load Specifications */}
        <Card className="border-brand-rule bg-brand-card p-6">
          <div className="flex items-center gap-2 border-b border-brand-rule/60 pb-3 mb-4">
            <Truck className="size-4 text-brand-accent" />
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-muted-soft">
              Cargo & Equipment Specs
            </h2>
          </div>

          <div className="space-y-3.5">
            <DetailRow
              icon={Truck}
              label="Equipment"
              value={load.loadType || "Dry Van"}
            />
            <DetailRow
              icon={Truck}
              label="Commodity"
              value={load.commodity || "General Freight"}
            />
            <DetailRow
              icon={FileText}
              label="Weight"
              value={load.weight ? `${load.weight} lbs` : "—"}
            />

            {load.isRefrigerated && (
              <DetailRow
                icon={Thermometer}
                label="Reefer Temp"
                value={load.temperature || "Refrigerated"}
              />
            )}

            <DetailRow
              icon={Calendar}
              label="Scheduled Pickup"
              value={
                load.pickupDate
                  ? formatWorkspaceDate(load.pickupDate, profile?.timeZone, undefined, { mode: "date" })
                  : "—"
              }
            />

            <DetailRow
              icon={Calendar}
              label="Scheduled Delivery"
              value={
                load.deliveryDate
                  ? formatWorkspaceDate(load.deliveryDate, profile?.timeZone, undefined, { mode: "date" })
                  : "—"
              }
            />

            {load.specialInstructions && (
              <div className="pt-2 border-t border-brand-rule/50">
                <p className="text-[10px] font-mono uppercase tracking-[0.04em] text-brand-muted-soft mb-1">
                  Handling Instructions
                </p>
                <p className="text-xs text-brand-ink bg-brand-cream/20 p-2.5 rounded border border-brand-rule/60">
                  {load.specialInstructions}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Financials & Tax Breakdown */}
        <Card className="border-brand-rule bg-brand-card p-6">
          <div className="flex items-center justify-between border-b border-brand-rule/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-brand-accent" />
              <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-brand-muted-soft">
                Financials & Sales Tax
              </h2>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {load.currency || "USD"}
            </Badge>
          </div>

          <div className="space-y-3.5">
            <DetailRow
              icon={User}
              label="Billed Customer"
              value={load.customerName || "—"}
            />
            <DetailRow
              icon={DollarSign}
              label="Base Freight Rate"
              value={
                load.rate
                  ? `${currencySymbol}${Number(load.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"
              }
            />

            {load.salesTaxType && load.salesTaxType !== "none" && (
              <>
                <DetailRow
                  icon={DollarSign}
                  label={`Sales Tax (${load.salesTaxType.toUpperCase()} ${load.salesTaxRate ? `${load.salesTaxRate}%` : ""})`}
                  value={
                    load.salesTaxAmount
                      ? `+ ${currencySymbol}${Number(load.salesTaxAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"
                  }
                />
              </>
            )}

            <div className="pt-3 border-t border-brand-rule flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-ink uppercase tracking-wide">
                Final Billable Total
              </span>
              <span className="font-mono text-base font-bold text-brand-accent">
                {load.finalRate
                  ? `${currencySymbol}${Number(load.finalRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${load.currency || "USD"}`
                  : load.rate
                    ? `${currencySymbol}${Number(load.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
              </span>
            </div>

            {load.bolNumber && (
              <DetailRow
                icon={FileText}
                label="BOL Number"
                value={load.bolNumber}
              />
            )}
            {load.rateConfirmNumber && (
              <DetailRow
                icon={FileText}
                label="Rate Con #"
                value={load.rateConfirmNumber}
              />
            )}
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
  date,
}: {
  icon: any
  label: string
  value: string
  sub: string | null
  date: string | null
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-brand-rule bg-brand-cream/10">
      <div className="flex size-8 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent shrink-0">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </p>
        <p className="text-sm font-medium text-brand-ink">{value}</p>
        {sub && <p className="text-xs text-brand-muted-soft mt-0.5">{sub}</p>}
        {date && <p className="text-xs text-brand-accent font-mono mt-1">{date}</p>}
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
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-brand-muted-soft">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-brand-ink text-right">{value}</span>
    </div>
  )
}
