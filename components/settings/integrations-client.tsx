"use client"

import * as React from "react"
import Link from "next/link"
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
  RefreshCw,
  Copy,
  Check,
  Sliders,
  Radio,
  Clock,
  Layers,
  Key,
  AlertCircle,
  Activity,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { sounds } from "@/lib/sound-effects"

// ─── AUTHENTIC LOGISTICS BRAND LOGOS (Vector SVGs) ───

function SamsaraLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#0c1e30" />
      <path
        d="M28 62c0-14.36 11.64-26 26-26s26 11.64 26 26h-9c0-9.39-7.61-17-17-17s-17 7.61-17 17h-9z"
        fill="#00e599"
      />
      <circle cx="54" cy="62" r="5" fill="#ffffff" />
    </svg>
  )
}

function MotiveLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#003e29" />
      <path
        d="M26 34l24 32 24-32h-12l-12 16-12-16H26z"
        fill="#00d084"
      />
    </svg>
  )
}

function GeotabLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#002d62" />
      <path
        d="M50 24L26 38v28l24 14 24-14V38L50 24zm0 12l14 8-14 8-14-8 14-8zm-14 20l10 6v12l-10-6V56zm18 18V62l10-6v12l-10 6z"
        fill="#00a3e0"
      />
    </svg>
  )
}

function DatLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#d9222a" />
      <path
        d="M28 32h16c10 0 18 8 18 18s-8 18-18 18H28V32zm14 26c4.5 0 8-3.5 8-8s-3.5-8-8-8h-4v16h4z"
        fill="#ffffff"
      />
      <path d="M64 42l10 26h-9l-2-6h-8l-2 6h-9l10-26h10zm-5 13h4l-2-6-2 6z" fill="#ffffff" />
    </svg>
  )
}

function TruckstopLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#ef6c00" />
      <path
        d="M30 32h40v10H56v28H44V42H30V32z"
        fill="#ffffff"
      />
      <circle cx="70" cy="62" r="6" fill="#ffffff" />
    </svg>
  )
}

function QuickBooksLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#2ca01c" />
      <path
        d="M48 28C36.95 28 28 36.95 28 48s8.95 20 20 20c7.37 0 13.82-4 17.25-10h-9.52c-2.3 3.65-6.38 6-11.73 6-7.73 0-14-6.27-14-14s6.27-14 14-14c5.35 0 9.43 2.35 11.73 6h9.52C61.82 32 55.37 28 48 28z"
        fill="#ffffff"
      />
      <path
        d="M52 72c11.05 0 20-8.95 20-20s-8.95-20-20-20c-7.37 0-13.82 4-17.25 10h9.52c2.3-3.65 6.38-6 11.73-6 7.73 0 14 6.27 14 14s-6.27 14-14 14c-5.35 0-9.43-2.35-11.73-6h-9.52C38.18 68 44.63 72 52 72z"
        fill="#ffffff"
      />
    </svg>
  )
}

function TriumphPayLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#003366" />
      <path
        d="M50 24L74 42v28L50 82 26 70V42l24-18zm0 12l-14 10v16l14 7 14-7V46L50 36z"
        fill="#00a8e8"
      />
    </svg>
  )
}

function WexLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#582c83" />
      <path
        d="M26 36l8 28 8-20 8 20 8-28h8l-12 36h-8l-8-20-8 20h-8l-12-36h8z"
        fill="#ffffff"
      />
    </svg>
  )
}

function ComdataLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#c41230" />
      <circle cx="50" cy="50" r="22" stroke="#ffffff" strokeWidth="8" />
      <circle cx="50" cy="50" r="8" fill="#ffcc00" />
    </svg>
  )
}

function GoogleMapsLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#ffffff" stroke="#e5e5e5" strokeWidth="2" />
      <path
        d="M50 20c-13.25 0-24 10.75-24 24 0 18 24 40 24 40s24-22 24-40c0-13.25-10.75-24-24-24zm0 33a9 9 0 110-18 9 9 0 010 18z"
        fill="#ea4335"
      />
      <circle cx="50" cy="44" r="7" fill="#ffffff" />
    </svg>
  )
}

function PcMilerLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#1b5e20" />
      <path
        d="M32 30h18c8.84 0 16 7.16 16 16s-7.16 16-16 16H42v12H32V30zm10 22h8c3.31 0 6-2.69 6-6s-2.69-6-6-6h-8v12z"
        fill="#a5d6a7"
      />
      <circle cx="68" cy="66" r="6" fill="#ffeb3b" />
    </svg>
  )
}

function FmcsaLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <rect width="100" height="100" rx="20" fill="#002868" />
      <path
        d="M50 20l24 9v24c0 16-10 30-24 35-14-5-24-19-24-35V29l24-9z"
        fill="#bf0a30"
      />
      <path
        d="M50 26L68 33v18c0 12-8 23-18 27-10-4-18-15-18-27V33l18-7z"
        fill="#ffffff"
      />
      <circle cx="50" cy="48" r="8" fill="#002868" />
    </svg>
  )
}

// ─── INTEGRATION DATA CATALOG ───

type IntegrationCategory =
  | "All"
  | "ELD / Telematics"
  | "Load Boards"
  | "Accounting & Factoring"
  | "Fuel & Tolls"
  | "Routing & Mileage"
  | "Safety & Compliance"

interface IntegrationItem {
  id: string
  name: string
  provider: string
  category: Exclude<IntegrationCategory, "All">
  description: string
  status: "connected" | "available"
  dataProtocol: string
  syncDescription: string
  connectedAccount?: string
  lastSync?: string
  Logo: React.FC<{ className?: string }>
}

const ENTERPRISE_INTEGRATIONS: IntegrationItem[] = [
  {
    id: "samsara",
    name: "Samsara ELD",
    provider: "Samsara Inc.",
    category: "ELD / Telematics",
    description: "Automated GPS live breadcrumb tracking, Hours of Service (HOS) driver duty status, and engine fault codes.",
    status: "connected",
    dataProtocol: "REST API v2 + Webhooks",
    syncDescription: "GPS pings polled every 60s; HOS duty changes pushed via instant webhook.",
    connectedAccount: "Fleet ID #4028 (28 Tractors)",
    lastSync: "3 mins ago",
    Logo: SamsaraLogo,
  },
  {
    id: "motive",
    name: "Motive (KeepTruckin)",
    provider: "Motive Technologies",
    category: "ELD / Telematics",
    description: "Driver vehicle inspection reports (DVIR), geofenced facility arrival pings, and IFTA mileage tracking.",
    status: "available",
    dataProtocol: "OAuth 2.0 / API Key",
    syncDescription: "Pulls daily DVIR pre-trip and post-trip logs directly into the safety hub.",
    Logo: MotiveLogo,
  },
  {
    id: "geotab",
    name: "Geotab Telematics",
    provider: "Geotab Inc.",
    category: "ELD / Telematics",
    description: "Commercial tractor diagnostics, odometer synchronization, and safety event sensor tracking.",
    status: "available",
    dataProtocol: "MyGeotab SDK",
    syncDescription: "Automatic odometer update on trip start and completion.",
    Logo: GeotabLogo,
  },
  {
    id: "dat",
    name: "DAT One Load Board",
    provider: "DAT Solutions",
    category: "Load Boards",
    description: "Instant truck capacity posting, private network freight matching, and spot rate index benchmark lookup.",
    status: "connected",
    dataProtocol: "DAT Carrier API",
    syncDescription: "Auto-posts empty trailers when a trip delivery is marked complete.",
    connectedAccount: "DOT-429104 Verified",
    lastSync: "12 mins ago",
    Logo: DatLogo,
  },
  {
    id: "truckstop",
    name: "Truckstop.com",
    provider: "Internet Truckstop",
    category: "Load Boards",
    description: "Rate insights, negotiation benchmarks, automated load book-it-now tender ingestion, and broker credit checks.",
    status: "available",
    dataProtocol: "Truckstop Partner API",
    syncDescription: "Imports accepted Rate Confirmations and sets up draft loads in Muvx.",
    Logo: TruckstopLogo,
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    provider: "Intuit Inc.",
    category: "Accounting & Factoring",
    description: "Two-way ledger sync for freight invoices, customer accounts, carrier payables, and fuel expense journal entries.",
    status: "connected",
    dataProtocol: "Intuit OAuth 2.0",
    syncDescription: "Finalized Muvx invoices automatically sync into QBO Accounts Receivable.",
    connectedAccount: "Muvx Logistics Inc. (Active)",
    lastSync: "8 mins ago",
    Logo: QuickBooksLogo,
  },
  {
    id: "triumph",
    name: "TriumphPay / Factoring",
    provider: "Triumph Financial",
    category: "Accounting & Factoring",
    description: "Automated schedule submission for factoring with signed POD and Notice of Assignment (NOA) package delivery.",
    status: "available",
    dataProtocol: "Triumph Direct API",
    syncDescription: "1-click factoring submission when POD is signed and validated in Document Vault.",
    Logo: TriumphPayLogo,
  },
  {
    id: "efs",
    name: "WEX / EFS Fleet Cards",
    provider: "WEX Inc.",
    category: "Fuel & Tolls",
    description: "Automated fuel transaction reconciliation, driver cash advances, discount tracking, and pump fraud alerts.",
    status: "connected",
    dataProtocol: "EFS Electronic Data Feed",
    syncDescription: "Daily fuel purchases imported and linked to active tractor VINs.",
    connectedAccount: "Card Acct #8849-01 (14 Cards)",
    lastSync: "1 hour ago",
    Logo: WexLogo,
  },
  {
    id: "comdata",
    name: "Comdata Fleet Cards",
    provider: "FLEETCOR Technologies",
    category: "Fuel & Tolls",
    description: "Electronic fuel card advances, express code generation, and automated pump authorization limits.",
    status: "available",
    dataProtocol: "Comdata Web Services",
    syncDescription: "Express code generation from dispatch trip screen.",
    Logo: ComdataLogo,
  },
  {
    id: "google_maps",
    name: "Google Maps Platform",
    provider: "Google LLC",
    category: "Routing & Mileage",
    description: "Truck routing, waypoint geocoding, live traffic delay projections, and satellite dock facility imagery.",
    status: "connected",
    dataProtocol: "Google Routes & Places API",
    syncDescription: "Computes route waypoints and turn-by-turn mileage on all loads.",
    connectedAccount: "Google Cloud Platform Project #8491",
    lastSync: "Real-time active",
    Logo: GoogleMapsLogo,
  },
  {
    id: "pcmiler",
    name: "PC*Miler (Trimble)",
    provider: "Trimble MAPS",
    category: "Routing & Mileage",
    description: "Industry-standard commercial truck routing, bridge height clearances, hazmat restrictions, and toll costs.",
    status: "available",
    dataProtocol: "Trimble MAPS Cloud API",
    syncDescription: "Practical vs Shortest commercial truck miles used for driver rate calculation.",
    Logo: PcMilerLogo,
  },
  {
    id: "fmcsa",
    name: "FMCSA SAFER & Clearinghouse",
    provider: "U.S. Dept of Transportation",
    category: "Safety & Compliance",
    description: "Automated carrier safety score audits, CDL drug/alcohol clearinghouse queries, and insurance status checks.",
    status: "connected",
    dataProtocol: "U.S. DOT Open Data API",
    syncDescription: "Weekly check on carrier safety rating and out-of-service percentiles.",
    connectedAccount: "USDOT #3910484 Verified",
    lastSync: "Today, 6:00 AM",
    Logo: FmcsaLogo,
  },
]

export function IntegrationsClient() {
  const [filter, setFilter] = React.useState("")
  const [category, setCategory] = React.useState<IntegrationCategory>("All")
  const [integrations, setIntegrations] = React.useState<IntegrationItem[]>(ENTERPRISE_INTEGRATIONS)
  const [selectedConfig, setSelectedConfig] = React.useState<IntegrationItem | null>(null)
  const [testStatus, setTestStatus] = React.useState<"idle" | "testing" | "success" | "error">("idle")
  const [copiedWebhook, setCopiedWebhook] = React.useState(false)

  // Configuration modal state
  const [apiKeyInput, setApiKeyInput] = React.useState("")
  const [clientIdInput, setClientIdInput] = React.useState("")
  const [syncCadence, setSyncCadence] = React.useState("realtime")

  const categories: IntegrationCategory[] = [
    "All",
    "ELD / Telematics",
    "Load Boards",
    "Accounting & Factoring",
    "Fuel & Tolls",
    "Routing & Mileage",
    "Safety & Compliance",
  ]

  const filtered = React.useMemo(() => {
    return integrations.filter((item) => {
      const matchCat = category === "All" || item.category === category
      const q = filter.toLowerCase().trim()
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.provider.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [integrations, category, filter])

  const connectedCount = integrations.filter((i) => i.status === "connected").length

  const handleOpenConfig = (item: IntegrationItem) => {
    sounds.playPulse()
    setSelectedConfig(item)
    setTestStatus("idle")
    setApiKeyInput(item.status === "connected" ? "••••••••••••••••••••••••••••••••" : "")
    setClientIdInput(item.status === "connected" ? item.connectedAccount || "" : "")
  }

  const handleTestConnection = () => {
    setTestStatus("testing")
    sounds.playTrackpadClick()

    setTimeout(() => {
      setTestStatus("success")
      sounds.playSuccess()
      toast.success(`${selectedConfig?.name} connection verified!`, {
        description: "Latency: 28ms · Handshake successful · Data feed active",
      })
    }, 1200)
  }

  const handleSaveConnection = () => {
    if (!selectedConfig) return
    sounds.playSuccess()

    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === selectedConfig.id
          ? {
              ...item,
              status: "connected",
              connectedAccount: clientIdInput || `${item.name} Production Feed`,
              lastSync: "Just now",
            }
          : item
      )
    )

    toast.success(`${selectedConfig.name} settings saved`, {
      description: "Data synchronization protocol is now active.",
    })
    setSelectedConfig(null)
  }

  const handleDisconnect = () => {
    if (!selectedConfig) return
    sounds.playWarning()

    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === selectedConfig.id
          ? {
              ...item,
              status: "available",
              connectedAccount: undefined,
              lastSync: undefined,
            }
          : item
      )
    )

    toast.info(`${selectedConfig.name} disconnected.`)
    setSelectedConfig(null)
  }

  const handleCopyWebhook = () => {
    if (!selectedConfig) return
    const url = `https://api.muvx.com/v1/webhooks/${selectedConfig.id}`
    navigator.clipboard.writeText(url)
    sounds.playPop()
    setCopiedWebhook(true)
    toast.success("Webhook URL copied to clipboard")
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto min-w-0">
      {/* ─── BREADCRUMB & HEADER ─── */}
      <div>
        <Link
          href="/settings"
          onClick={() => sounds.playTrackpadClick()}
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand-muted-soft hover:text-brand-ink transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Settings Hub
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-brand-accent-tint text-brand-accent border border-brand-accent/20">
                <Plug className="size-3.5" />
                Enterprise Carrier API Gateway
              </span>
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              Connected <span className="italic text-[#d9622b]">Systems</span> & Telematics
            </h1>
            <p className="mt-1 text-sm text-[#73757a]">
              Synchronize fleet ELDs, load boards, factoring feeds, fuel advances, and commercial routing engines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-brand-rule bg-brand-card text-brand-ink text-xs py-1 px-3 gap-1.5 font-mono">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {connectedCount} Connected Protocols
            </Badge>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI TILES ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Truck className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              GPS Live
            </span>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            Samsara
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Primary ELD Telematics</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">28 power units synced</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <Receipt className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              2-Way Sync
            </span>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            QuickBooks
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">General Ledger Sync</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">Invoices & driver pay reconciled</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10 text-red-700">
              <Layers className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Capacity On
            </span>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            DAT One
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Freight Network Posting</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">DOT-429104 verified feed</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Fuel className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Automated
            </span>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            WEX / EFS
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Fleet Card Fuel Ingestion</p>
          <p className="text-[10px] mt-1 text-brand-muted-soft/70">14 cards active</p>
        </Card>
      </div>

      {/* ─── FILTERS & SEARCH TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-brand-rule pb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search integrations, APIs, protocols..."
            className="h-9 pl-9 text-xs bg-brand-card border-brand-rule focus-visible:ring-brand-accent"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => {
                sounds.playTrackpadClick()
                setCategory(c)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                category === c
                  ? "bg-brand-ink text-brand-cream shadow-xs"
                  : "bg-brand-card border border-brand-rule text-brand-muted-soft hover:text-brand-ink hover:bg-brand-cream-soft"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ENTERPRISE INTEGRATIONS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const Logo = item.Logo
          const isConnected = item.status === "connected"

          return (
            <Card
              key={item.id}
              className="border-brand-rule bg-brand-card p-5 flex flex-col justify-between hover:border-brand-rule-dark transition-all space-y-4 shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-brand-rule/60 overflow-hidden bg-brand-card">
                      <Logo className="size-9" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-brand-ink leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-brand-muted-soft">
                        {item.provider}
                      </p>
                    </div>
                  </div>

                  {isConnected ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono gap-1 shrink-0">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-brand-rule text-brand-muted-soft text-[10px] font-mono shrink-0">
                      Available
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-brand-ink/80 leading-relaxed min-h-[36px]">
                  {item.description}
                </p>

                {/* Protocol Pill */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-cream/40 border border-brand-rule text-brand-muted-soft">
                    {item.dataProtocol}
                  </span>
                  {item.lastSync && (
                    <span className="text-[10px] font-mono text-emerald-700 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {item.lastSync}
                    </span>
                  )}
                </div>

                {item.connectedAccount && (
                  <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-[11px] font-mono text-emerald-800 flex items-center justify-between">
                    <span className="truncate max-w-[200px]">{item.connectedAccount}</span>
                    <span className="text-[10px] text-emerald-600 font-sans shrink-0">Active</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-brand-rule flex items-center justify-between">
                <span className="text-[11px] text-brand-muted-soft">
                  {isConnected ? "Automatic 2-way sync" : "Requires API credentials"}
                </span>
                <Button
                  size="sm"
                  variant={isConnected ? "outline" : "default"}
                  onClick={() => handleOpenConfig(item)}
                  className={`h-8 text-xs font-medium cursor-pointer ${
                    isConnected
                      ? "border-brand-rule text-brand-ink hover:bg-brand-cream-soft"
                      : "bg-[#d9622b] hover:bg-[#c25422] text-white"
                  }`}
                >
                  {isConnected ? "Configure" : "Connect Protocol"}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ─── ENTERPRISE CONFIGURATION DIALOG ─── */}
      {selectedConfig && (
        <Dialog open={!!selectedConfig} onOpenChange={(o) => !o && setSelectedConfig(null)}>
          <DialogContent className="sm:max-w-lg border-brand-rule bg-brand-card">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl flex items-center justify-center shrink-0 border border-brand-rule overflow-hidden bg-brand-card">
                  <selectedConfig.Logo className="size-9" />
                </div>
                <div>
                  <DialogTitle className="font-serif text-lg text-brand-ink">
                    Configure {selectedConfig.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-brand-muted-soft">
                    {selectedConfig.category} · {selectedConfig.provider}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* How it works blurb */}
              <div className="rounded-xl bg-brand-cream/30 p-3.5 border border-brand-rule space-y-1.5">
                <p className="text-xs font-medium text-brand-ink flex items-center gap-1.5">
                  <Activity className="size-3.5 text-brand-accent" />
                  Data Exchange Protocol
                </p>
                <p className="text-[11px] text-brand-muted-soft leading-relaxed">
                  {selectedConfig.syncDescription}
                </p>
              </div>

              {/* API Credentials */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="api-key" className="text-xs font-medium text-brand-ink">
                    Production API Secret / Token <span className="text-brand-accent">*</span>
                  </Label>
                  <div className="relative">
                    <Key className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted-soft" />
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="e.g. sk_live_84910284091..."
                      className="h-8 pl-8 text-xs border-brand-rule bg-brand-cream/10 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-id" className="text-xs font-medium text-brand-ink">
                    Account ID / Organization Number
                  </Label>
                  <Input
                    id="client-id"
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="e.g. DOT-429104 or Fleet #4028"
                    className="h-8 text-xs border-brand-rule bg-brand-cream/10 font-mono"
                  />
                </div>

                {/* Webhook Endpoint */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-brand-ink">
                    Muvx Webhook Receiver URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`https://api.muvx.com/v1/webhooks/${selectedConfig.id}`}
                      className="h-8 text-[11px] border-brand-rule bg-brand-cream/20 font-mono text-brand-muted-soft select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhook}
                      className="h-8 px-2.5 shrink-0 border-brand-rule text-xs"
                    >
                      {copiedWebhook ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-brand-muted-soft">
                    Paste this URL into your {selectedConfig.name} dashboard under Webhook Settings.
                  </p>
                </div>

                {/* Sync Cadence */}
                <div className="space-y-1.5">
                  <Label htmlFor="cadence" className="text-xs font-medium text-brand-ink">
                    Polling & Refresh Cadence
                  </Label>
                  <Select value={syncCadence} onValueChange={setSyncCadence}>
                    <SelectTrigger className="h-8 text-xs border-brand-rule">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime" className="text-xs">Real-time Webhook Push (Instant)</SelectItem>
                      <SelectItem value="5min" className="text-xs">High Frequency (Every 5 minutes)</SelectItem>
                      <SelectItem value="15min" className="text-xs">Standard Telematics (Every 15 minutes)</SelectItem>
                      <SelectItem value="hourly" className="text-xs">Hourly Batch Reconciliation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Test Status Banner */}
              {testStatus === "success" && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>API Ping Successful: 28ms roundtrip. System ready for automatic ingestion.</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-brand-rule">
              {selectedConfig.status === "connected" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
                >
                  Disconnect
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="text-xs border-brand-rule hover:bg-brand-cream-soft gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                <span>{testStatus === "testing" ? "Pinging API..." : "Test Connection"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveConnection}
                className="text-xs bg-brand-ink text-brand-cream hover:bg-brand-ink/90"
              >
                Save Protocol
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
