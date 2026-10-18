import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Banknote,
  ClipboardList,
  Users,
  Truck,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  DollarSign,
} from "lucide-react"
import {
  getSession,
  getPayStubsWithDetailsForOrg,
  getCarrierPaymentsWithDetailsForOrg,
  getDriversForOrg,
  getCarriersForOrg,
} from "@/lib/dal"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const instant = false

export default async function SettlementsHubPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [payStubs, carrierPayments, drivers, carriers] = await Promise.all([
    getPayStubsWithDetailsForOrg(tenantId),
    getCarrierPaymentsWithDetailsForOrg(tenantId),
    getDriversForOrg(tenantId),
    getCarriersForOrg(tenantId),
  ])

  // Compute driver totals
  let driverPendingTotal = 0
  let driverPendingCount = 0
  let driverPaidTotal = 0
  for (const p of payStubs) {
    const net = parseFloat(p.netPay || "0")
    if (p.status === "pending") {
      driverPendingTotal += net
      driverPendingCount++
    } else if (p.status === "paid") {
      driverPaidTotal += net
    }
  }

  // Compute carrier totals
  let carrierPendingTotal = 0
  let carrierPendingCount = 0
  let carrierPaidTotal = 0
  for (const c of carrierPayments) {
    const net = parseFloat(c.netAmount || c.amount || "0")
    if (c.status === "pending" || c.status === "approved") {
      carrierPendingTotal += net
      carrierPendingCount++
    } else if (c.status === "paid") {
      carrierPaidTotal += net
    }
  }

  const grandPending = driverPendingTotal + carrierPendingTotal
  const grandDisbursed = driverPaidTotal + carrierPaidTotal

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* ─── STUDIO HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Financial <span className="italic text-brand-accent">Settlements</span> Hub
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Consolidated overview of company driver payroll, trip mileages, outside carrier pay, and remittance reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/payroll" />}
            className="rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-hover text-xs h-9 px-4"
          >
            <Users className="size-3.5 mr-1.5" />
            Driver Payroll
          </Button>
          <Button
            render={<Link href="/carrier-pay" />}
            className="rounded-full bg-brand-accent text-white hover:bg-brand-accent-hover text-xs h-9 px-4"
          >
            <Truck className="size-3.5 mr-1.5" />
            Carrier Settlements
          </Button>
        </div>
      </div>

      {/* ─── KPI SUMMARY HUD ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Total Pending Settlements
            </span>
            <Clock className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-brand-ink">
            ${grandPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            {driverPendingCount + carrierPendingCount} statements awaiting remittance
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Driver Payroll Pending
            </span>
            <Users className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-brand-ink">
            ${driverPendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            {driverPendingCount} driver stubs awaiting payment
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Carrier Remittances Due
            </span>
            <Truck className="size-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-brand-ink">
            ${carrierPendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            {carrierPendingCount} broker / carrier pay records
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Total Disbursed MTD
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-emerald-600">
            ${grandDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Settled disbursements
          </p>
        </Card>
      </div>

      {/* ─── TWO DEDICATED SETTLEMENT SECTIONS ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Module Card 1: Driver Payroll & Settlements */}
        <Card className="border-brand-rule bg-brand-card p-6 shadow-xs rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <Badge variant="outline" className="text-xs font-mono border-brand-rule">
                {drivers.length} Drivers on Roster
              </Badge>
            </div>

            <div>
              <h2 className="font-serif text-xl font-bold text-brand-ink">Driver Payroll Engine</h2>
              <p className="text-xs text-brand-muted-soft mt-1 leading-relaxed">
                Calculate weekly driver pay stubs, gross mileage earnings, fuel/toll reimbursements, advances, and net direct deposits.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-cream-soft/40 border border-brand-rule/60 flex items-center justify-between text-xs">
              <span className="text-brand-muted-soft">Pending Driver Stubs</span>
              <span className="font-mono font-bold text-brand-ink">
                ${driverPendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-brand-rule/60 flex items-center justify-between">
            <span className="text-xs text-brand-muted-soft">{payStubs.length} total statements</span>
            <Button
              render={<Link href="/payroll" />}
              size="sm"
              className="rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-hover text-xs gap-1"
            >
              Open Driver Payroll
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </Card>

        {/* Module Card 2: Outside Carrier Settlements */}
        <Card className="border-brand-rule bg-brand-card p-6 shadow-xs rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Truck className="size-5" />
              </div>
              <Badge variant="outline" className="text-xs font-mono border-brand-rule">
                {carriers.length} Contracted Carriers
              </Badge>
            </div>

            <div>
              <h2 className="font-serif text-xl font-bold text-brand-ink">Carrier Settlements & Pay</h2>
              <p className="text-xs text-brand-muted-soft mt-1 leading-relaxed">
                Manage outside sub-contracted carrier settlements, agreed rate confirmations, linehaul fees, and remittance reconciliation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-cream-soft/40 border border-brand-rule/60 flex items-center justify-between text-xs">
              <span className="text-brand-muted-soft">Carrier Remittances Due</span>
              <span className="font-mono font-bold text-brand-ink">
                ${carrierPendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-brand-rule/60 flex items-center justify-between">
            <span className="text-xs text-brand-muted-soft">{carrierPayments.length} carrier records</span>
            <Button
              render={<Link href="/carrier-pay" />}
              size="sm"
              className="rounded-full bg-brand-accent text-white hover:bg-brand-accent-hover text-xs gap-1"
            >
              Open Carrier Pay
              <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
