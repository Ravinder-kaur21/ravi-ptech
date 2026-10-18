"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plug,
  ArrowLeft,
  Search,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Truck,
  Receipt,
  MapPin,
  Fuel,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

type Integration = {
  id: string
  name: string
  category: "ELD / Telematics" | "Load Boards" | "Accounting & Factoring" | "Fuel & Tolls"
  description: string
  status: "connected" | "available" | "coming_soon"
  connectedAccount?: string
  logoText: string
  color: string
}

const INTEGRATIONS: Integration[] = [
  {
    id: "samsara",
    name: "Samsara ELD",
    category: "ELD / Telematics",
    description: "Real-time GPS tracking, HOS driver logs, engine diagnostics, and IFTA mileages.",
    status: "connected",
    connectedAccount: "Fleet #4028 (API V2 Active)",
    logoText: "SAM",
    color: "bg-blue-600 text-white",
  },
  {
    id: "motive",
    name: "Motive (KeepTruckin)",
    category: "ELD / Telematics",
    description: "Automated Hours of Service, driver vehicle inspection reports (DVIR), and location pings.",
    status: "available",
    logoText: "MOT",
    color: "bg-emerald-600 text-white",
  },
  {
    id: "dat",
    name: "DAT One Load Board",
    category: "Load Boards",
    description: "Post available truck capacity and search North America's largest freight network instantly.",
    status: "connected",
    connectedAccount: "DOT-429104 Verified",
    logoText: "DAT",
    color: "bg-red-600 text-white",
  },
  {
    id: "truckstop",
    name: "Truckstop.com",
    category: "Load Boards",
    description: "Rate insights, load matching, negotiation benchmarks, and carrier vetting.",
    status: "available",
    logoText: "TS",
    color: "bg-amber-600 text-white",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "Accounting & Factoring",
    description: "Sync invoices, broker payables, fuel expenses, and driver payroll disbursements automatically.",
    status: "connected",
    connectedAccount: "Muvx Carrier Corp (Synced 10m ago)",
    logoText: "QBO",
    color: "bg-emerald-700 text-white",
  },
  {
    id: "triumph",
    name: "Triumph Factoring",
    category: "Accounting & Factoring",
    description: "One-click freight factoring submission with automated NOA and instant credit approvals.",
    status: "available",
    logoText: "TRI",
    color: "bg-indigo-600 text-white",
  },
  {
    id: "efs",
    name: "WEX / EFS Fleet Cards",
    category: "Fuel & Tolls",
    description: "Automated fuel transaction reconciliation, driver cash advances, and discount reporting.",
    status: "available",
    logoText: "EFS",
    color: "bg-purple-600 text-white",
  },
  {
    id: "pcmiler",
    name: "Trimble PC*MILER",
    category: "ELD / Telematics",
    description: "Commercial truck routing, practical vs shortest highway mileage, and toll calculation.",
    status: "available",
    logoText: "PCM",
    color: "bg-sky-600 text-white",
  },
]

export function IntegrationsClient() {
  const [filter, setFilter] = React.useState("")
  const [category, setCategory] = React.useState<string>("All")

  const categories = ["All", "ELD / Telematics", "Load Boards", "Accounting & Factoring", "Fuel & Tolls"]

  const filtered = INTEGRATIONS.filter((item) => {
    const matchesCategory = category === "All" || item.category === category
    const matchesSearch =
      item.name.toLowerCase().includes(filter.toLowerCase()) ||
      item.description.toLowerCase().includes(filter.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleToggle = (item: Integration) => {
    if (item.status === "connected") {
      toast.info(`${item.name} settings opened. Synchronization is active.`)
    } else {
      toast.success(`Connection initiated for ${item.name}. Webhook listener ready.`)
    }
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
              <Plug className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl tracking-tight text-brand-ink font-semibold">
                Integrations & Connected Platforms
              </h1>
              <p className="text-xs text-brand-muted-soft mt-1 max-w-xl leading-relaxed">
                Connect your ELD providers, load boards, factoring companies, and accounting software to synchronize telematics, live dispatches, and financial ledgers automatically.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-rule">
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-mono px-2.5 py-0.5">
              3 Active Connections
            </Badge>
            <span className="text-[11px] text-brand-muted-soft">
              Real-time webhook sync enabled
            </span>
          </div>
        </div>
      </div>

      {/* ─── KPI Dashboard Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            {INTEGRATIONS.filter((i) => i.status === "connected").length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active Integrations</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Connected & syncing webhooks</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Truck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            Samsara
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">ELD & GPS Fleet Sync</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">HOS & telematics live</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Receipt className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-blue-700">
            QuickBooks
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Ledger Synchronization</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Invoices & payables posted</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Plug className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-purple-700">
            DAT One
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Direct Capacity Postings</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Freight matching active</p>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search integrations, protocols, APIs..."
            className="h-9 pl-9 text-xs bg-brand-cream/30 border-brand-rule"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                category === c
                  ? "bg-brand-ink text-brand-cream"
                  : "bg-brand-card border border-brand-rule text-brand-ink/80 hover:bg-brand-cream/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <Card
            key={item.id}
            className="border-brand-rule bg-brand-card p-5 flex flex-col justify-between hover:shadow-xs transition-shadow space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${item.color}`}
                  >
                    {item.logoText}
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-semibold text-brand-ink">
                      {item.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand-muted-soft">
                      {item.category}
                    </span>
                  </div>
                </div>

                {item.status === "connected" ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-brand-rule text-brand-muted-soft text-[10px] font-mono">
                    Available
                  </Badge>
                )}
              </div>

              <p className="text-xs text-brand-ink/80 leading-relaxed">
                {item.description}
              </p>

              {item.connectedAccount && (
                <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-[11px] font-mono text-emerald-800 flex items-center justify-between">
                  <span>{item.connectedAccount}</span>
                  <span className="text-[10px] text-emerald-600 font-sans">Active Sync</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-brand-rule flex items-center justify-between">
              <span className="text-[11px] text-brand-muted-soft">
                {item.status === "connected" ? "Auto-synced with dispatch" : "OAuth 2.0 / API Key"}
              </span>
              <Button
                size="sm"
                variant={item.status === "connected" ? "outline" : "default"}
                onClick={() => handleToggle(item)}
                className={`h-8 text-xs ${
                  item.status === "connected"
                    ? "border-brand-rule text-brand-ink hover:bg-brand-cream/50"
                    : "bg-brand-ink text-brand-cream hover:bg-brand-ink/90"
                }`}
              >
                {item.status === "connected" ? "Configure" : "Connect"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
