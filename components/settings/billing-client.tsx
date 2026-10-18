"use client"

import * as React from "react"
import Link from "next/link"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  ShieldCheck,
  Truck,
  Users,
  Zap,
  Building2,
} from "lucide-react"
import { toast } from "sonner"

export function BillingClient() {
  const activeOrg = useAuthStore((s) => s.activeOrganization)

  const handlePortal = () => {
    toast.info("Connecting to Stripe billing portal...")
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-brand-rule bg-brand-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl tracking-tight text-brand-ink font-semibold">
                  Billing & Subscription
                </h1>
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-mono">
                  Active Subscription
                </Badge>
              </div>
              <p className="text-xs text-brand-muted-soft mt-1 max-w-xl leading-relaxed">
                Manage your Muvx TMS tier, truck capacity billing, payment methods, and historical invoices for {activeOrg?.name || "your workspace"}.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-rule">
            <Button
              size="sm"
              onClick={handlePortal}
              className="h-8 text-xs bg-brand-ink text-brand-cream hover:bg-brand-ink/90 gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              Stripe Customer Portal
            </Button>
            <span className="text-[11px] text-brand-muted-soft">
              Next renewal: Nov 1, 2026
            </span>
          </div>
        </div>
      </div>

      {/* ─── KPI Dashboard Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <CreditCard className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            $149<span className="text-sm font-sans font-normal text-brand-muted-soft">/mo</span>
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Current Rate Plan</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Muvx Growth Subscription</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Truck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-blue-700">
            8 <span className="text-sm font-sans font-normal text-brand-muted-soft">/ 20</span>
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Enrolled Power Units</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">12 vehicle slots available</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <Users className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            5 <span className="text-sm font-sans font-normal text-brand-muted-soft">/ 10</span>
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active Operator Seats</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">5 teammate seats remaining</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Zap className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-purple-700">
            Active
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Account Standing</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Automated Stripe billing</p>
        </Card>
      </div>

      {/* Plan Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-brand-rule bg-brand-card p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                Current Plan
              </span>
              <h2 className="font-serif text-xl font-bold text-brand-ink mt-0.5">
                Muvx Fleet Growth
              </h2>
              <p className="text-xs text-brand-muted-soft mt-1">
                Unlimited load dispatching, automated driver settlement, FMCSA compliance, and real-time telematics sync.
              </p>
            </div>
            <div className="text-right">
              <span className="font-serif text-3xl font-bold text-brand-ink">$149</span>
              <span className="text-xs text-brand-muted-soft"> / month</span>
            </div>
          </div>

          <Separator className="bg-brand-rule" />

          {/* Usage bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-brand-cream/40 border border-brand-rule space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
                <Truck className="size-3.5 text-brand-accent" />
                Active Power Units
              </div>
              <p className="font-serif text-lg font-semibold text-brand-ink">8 / 20 Trucks</p>
              <div className="h-1.5 w-full bg-brand-cream-soft rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent w-[40%]" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-cream/40 border border-brand-rule space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
                <Users className="size-3.5 text-brand-accent" />
                Team Seats
              </div>
              <p className="font-serif text-lg font-semibold text-brand-ink">5 / 10 Users</p>
              <div className="h-1.5 w-full bg-brand-cream-soft rounded-full overflow-hidden">
                <div className="h-full bg-brand-ink w-[50%]" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-cream/40 border border-brand-rule space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
                <Zap className="size-3.5 text-brand-accent" />
                Copilot Dispatches
              </div>
              <p className="font-serif text-lg font-semibold text-brand-ink">Unlimited</p>
              <span className="text-[10px] text-emerald-700 font-medium">Included in Growth</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-brand-muted-soft">
              Need to add more than 20 trucks?
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Opening enterprise upgrade consultation")}
              className="h-8 text-xs border-brand-rule text-brand-ink hover:bg-brand-cream/50"
            >
              Upgrade to Enterprise (50+ trucks)
            </Button>
          </div>
        </Card>

        {/* Payment Method Card */}
        <Card className="border-brand-rule bg-brand-card p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                Payment Method
              </span>
              <h3 className="font-serif text-base font-semibold text-brand-ink mt-0.5">
                Card on File
              </h3>
            </div>

            <div className="p-4 rounded-xl border border-brand-rule bg-brand-cream/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-ink">VISA</span>
                <Badge variant="outline" className="border-brand-rule text-[10px] font-mono">
                  Default
                </Badge>
              </div>
              <p className="font-mono text-sm tracking-wider text-brand-ink">
                •••• •••• •••• 4242
              </p>
              <div className="flex justify-between text-[11px] text-brand-muted-soft">
                <span>Expires 12/28</span>
                <span>USD Currency</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePortal}
            className="w-full h-8 text-xs border-brand-rule text-brand-ink hover:bg-brand-cream/50"
          >
            Update Payment Method
          </Button>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-brand-ink">
            Billing History & Receipts
          </h3>
          <p className="text-xs text-brand-muted-soft mt-0.5">
            Download PDF receipts and tax statements for your accounting reconciliation.
          </p>
        </div>

        <div className="divide-y divide-brand-rule border-t border-brand-rule">
          {[
            { id: "INV-2026-10", date: "Oct 1, 2026", amount: "$149.00", status: "Paid" },
            { id: "INV-2026-09", date: "Sep 1, 2026", amount: "$149.00", status: "Paid" },
            { id: "INV-2026-08", date: "Aug 1, 2026", amount: "$149.00", status: "Paid" },
          ].map((inv) => (
            <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-brand-ink">{inv.id}</span>
                <span className="text-brand-muted-soft">{inv.date}</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono">
                  {inv.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono font-semibold text-brand-ink">{inv.amount}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.success(`Downloading receipt for ${inv.id}`)}
                  className="h-7 px-2 text-brand-muted-soft hover:text-brand-ink"
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
