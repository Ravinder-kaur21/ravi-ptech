/**
 * Permission-driven dashboard sections.
 *
 * Each section self-gates on one or more permission keys. The
 * DashboardPage renders them all in order; a section that the
 * current user has no permission for returns null and is removed
 * from the DOM entirely.
 *
 * No role names. No `if (role === "X")`. The permission set is
 * the single source.
 */

import * as React from "react"
import Link from "next/link"
import {
  Truck,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ShieldAlert,
  Calendar,
  Users,
  FileText,
  ArrowUpRight,
  ChevronRight,
  Clock,
  type LucideIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/lib/permissions-context"
import { cn } from "@/lib/utils"

type KpiData = { activeLoads: number; activeDrivers: number; revenue: number; onTime: number | null }

type KpiRowProps = { data: KpiData }

export function KpiRow({ data }: KpiRowProps) {
  const perms = usePermissions()
  const cards: { key: string; label: string; value: string; icon: LucideIcon; perm: string }[] = [
    { key: "loads", label: "Active loads", value: String(data.activeLoads), icon: Truck, perm: "loads.view_all" },
    { key: "drivers", label: "Drivers on road", value: String(data.activeDrivers), icon: MapPin, perm: "drivers.view_all" },
    { key: "revenue", label: "Revenue MTD", value: formatCurrency(data.revenue), icon: DollarSign, perm: "reports.financial.view_revenue" },
    { key: "ontime", label: "On-time %", value: data.onTime == null ? "—" : `${data.onTime}%`, icon: CheckCircle2, perm: "reports.operational.view" },
  ]
  const visible = cards.filter((c) => perms.has(c.perm))
  if (visible.length === 0) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {visible.map((c) => (
        <KpiCard key={c.key} label={c.label} value={c.value} icon={c.icon} />
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <Card className="border-brand-rule bg-brand-card p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-geist-mono uppercase tracking-[0.04em] text-brand-muted-soft">{label}</p>
          <p className="mt-2 font-serif text-3xl tracking-tight text-brand-ink">{value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-accent-tint/60">
          <Icon className="size-4 text-brand-accent" strokeWidth={1.8} />
        </div>
      </div>
    </Card>
  )
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}

// ─── AR aging (Accounting) ────────────────────────────────────────
export function ArAging({ data }: { data: { current: number; d30: number; d60: number; d90: number } }) {
  const perms = usePermissions()
  if (!perms.has("accounting.ar.view")) return null
  return (
    <Card className="border-brand-rule bg-brand-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-serif text-lg text-brand-ink">AR aging</p>
          <p className="text-[12px] text-brand-muted-soft">Outstanding by age</p>
        </div>
        <Link
          href="/invoices"
          className="text-[12px] text-brand-accent hover:underline flex items-center gap-1"
        >
          Open invoices
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Current", value: data.current, color: "text-brand-ink" },
          { label: "1-30 d", value: data.d30, color: "text-brand-ink" },
          { label: "31-60 d", value: data.d60, color: "text-amber-700" },
          { label: "60+ d", value: data.d90, color: "text-red-700" },
        ].map((b) => (
          <div key={b.label} className="rounded-md border border-brand-rule p-3 bg-brand-cream/40">
            <p className="text-[10px] font-mono uppercase tracking-wide text-brand-muted-soft">
              {b.label}
            </p>
            <p className={cn("mt-1 text-[16px] font-semibold", b.color)}>
              {formatCurrency(b.value)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Open safety issues (Safety) ──────────────────────────────────
export function OpenSafetyIssues({
  data,
}: {
  data: {
    dqGaps: number
    hosViolations: number
    openAccidents: number
  }
}) {
  const perms = usePermissions()
  if (!perms.has("safety.module")) return null
  const total = data.dqGaps + data.hosViolations + data.openAccidents
  return (
    <Card className="border-brand-rule bg-brand-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-serif text-lg text-brand-ink">Open safety issues</p>
          <p className="text-[12px] text-brand-muted-soft">
            {total} item{total === 1 ? "" : "s"} needing attention
          </p>
        </div>
        <Link
          href="/safety"
          className="text-[12px] text-brand-accent hover:underline flex items-center gap-1"
        >
          Open safety
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <ul className="space-y-2">
        {data.dqGaps > 0 && (
          <SafetyRow
            icon={Users}
            label={`${data.dqGaps} driver DQ file gap${data.dqGaps === 1 ? "" : "s"}`}
            href="/drivers"
            tone="amber"
          />
        )}
        {data.hosViolations > 0 && (
          <SafetyRow
            icon={Clock}
            label={`${data.hosViolations} HOS violation${data.hosViolations === 1 ? "" : "s"} flagged`}
            href="/safety"
            tone="red"
          />
        )}
        {data.openAccidents > 0 && (
          <SafetyRow
            icon={ShieldAlert}
            label={`${data.openAccidents} open accident report${data.openAccidents === 1 ? "" : "s"}`}
            href="/safety"
            tone="red"
          />
        )}
        {total === 0 && (
          <li className="text-[13px] text-brand-muted-soft flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-700" />
            Nothing needs your attention. Nice.
          </li>
        )}
      </ul>
    </Card>
  )
}

function SafetyRow({
  icon: Icon,
  label,
  href,
  tone,
}: {
  icon: LucideIcon
  label: string
  href: string
  tone: "amber" | "red"
}) {
  const toneClass = tone === "red" ? "text-red-700" : "text-amber-700"
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-md border border-brand-rule p-3 hover:bg-brand-cream/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("size-4 shrink-0", toneClass)} />
          <span className="text-[13px] text-brand-ink truncate">{label}</span>
        </div>
        <ChevronRight className="size-3.5 text-brand-muted-soft shrink-0" />
      </Link>
    </li>
  )
}

// ─── Today queue — the exceptional piece ──────────────────────────
type TodayItem = {
  id: string
  title: string
  detail: string
  href: string
  cta: string
  requiresKey: string
  tone?: "default" | "amber" | "red"
}

export function TodayQueue({ items }: { items: TodayItem[] }) {
  const perms = usePermissions()
  const visible = items.filter((i) => perms.has(i.requiresKey))
  if (visible.length === 0) return null
  return (
    <Card className="border-brand-rule bg-brand-card p-5">
      <div className="mb-3">
        <p className="font-serif text-lg text-brand-ink">Needs your attention</p>
        <p className="text-[12px] text-brand-muted-soft">
          {visible.length} thing{visible.length === 1 ? "" : "s"} you can act on now
        </p>
      </div>
      <ul className="space-y-2">
        {visible.map((i) => (
          <li key={i.id}>
            <Link
              href={i.href}
              className="flex items-center gap-3 rounded-md border border-brand-rule p-3 hover:bg-brand-cream/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-brand-ink truncate">
                  {i.title}
                </p>
                <p className="text-[12px] text-brand-muted-soft truncate">
                  {i.detail}
                </p>
              </div>
              <span className="text-[12px] text-brand-accent font-medium shrink-0 flex items-center gap-1">
                {i.cta}
                <ChevronRight className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ─── Driver self card ────────────────────────────────────────────
export function DriverTodayCard({
  nextPickup,
  activeLoad,
}: {
  nextPickup?: { facilityName: string; address: string; appointmentAt: string; loadId: string }
  activeLoad?: { id: string; stops: { kind: string; city: string; state: string; at: string }[] }
}) {
  const perms = usePermissions()
  if (!perms.has("loads.view_own") || !nextPickup) return null
  return (
    <Card className="border-brand-rule bg-brand-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-brand-accent" />
        <p className="font-serif text-lg text-brand-ink">Your next pickup</p>
      </div>
      <div className="rounded-md border border-brand-rule p-4 bg-brand-cream/40">
        <p className="text-[12px] font-mono uppercase tracking-wide text-brand-muted-soft">
          {new Date(nextPickup.appointmentAt).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-1 text-[15px] font-semibold text-brand-ink">
          {nextPickup.facilityName}
        </p>
        <p className="text-[12px] text-brand-muted-soft">{nextPickup.address}</p>
        <p className="mt-1 text-[11px] text-brand-muted-soft">
          Load #{nextPickup.loadId}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          render={
            <Link href={`/driver-portal/status?loadId=${nextPickup.loadId}`}>
              Update status
            </Link>
          }
          className="h-9 flex-1 rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-soft text-[13px]"
        />
        <Button
          render={
            <Link href={`/driver-portal/pod?loadId=${nextPickup.loadId}`}>
              Upload POD
            </Link>
          }
          variant="outline"
          className="h-9 flex-1 rounded-full border-brand-rule text-[13px]"
        />
      </div>
    </Card>
  )
}
