"use client"

/**
 * SystemHealth — DB latency, env-var presence, maintenance state,
 * error count, last-error timestamp. Powers the "Safety" card on
 * the /admin home page.
 */
import * as React from "react"
import {
  Server,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Activity,
  Database,
  type LucideIcon,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Health = {
  dbLatencyMs: number
  resendConfigured: boolean
  betterAuthUrlSet: boolean
  maintenanceMode: boolean
  errors24h: number
  lastErrorAt: string | null
}

export function SystemHealth({ health, loading }: { health: Health | null; loading?: boolean }) {
  console.log("[OVERVIEW/HEALTH] rendering", { health, loading })
  if (loading || !health) {
    return (
      <Card className="border-brand-rule bg-brand-card">
        <CardContent className="space-y-2 p-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }
  const dbStatus = health.dbLatencyMs < 100 ? "ok" : health.dbLatencyMs < 300 ? "warn" : "danger"
  const overall = health.maintenanceMode
    ? "maintenance"
    : dbStatus === "danger" || health.errors24h > 50
      ? "degraded"
      : "ok"

  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
          <Server className="size-4 text-brand-accent" />
          System health
        </CardTitle>
        <CardDescription className="text-[12px] text-brand-muted-soft">
          Real-time status of the platform. Refresh on every page load.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <OverallBanner status={overall} maintenance={health.maintenanceMode} />
        <Row icon={Database} label="Database latency" tone={dbStatus}>
          {health.dbLatencyMs} ms
        </Row>
        <Row icon={Activity} label="Errors (24h)" tone={health.errors24h > 50 ? "danger" : "default"}>
          {health.errors24h}
          {health.lastErrorAt && (
            <span className="ml-2 font-mono text-[10px] text-brand-muted-soft">
              · last{" "}
              {new Date(health.lastErrorAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </Row>
        <Row icon={Mail} label="Resend" tone={health.resendConfigured ? "ok" : "warn"}>
          {health.resendConfigured ? "Configured" : "Missing RESEND_API_KEY"}
        </Row>
        <Row
          icon={Wrench}
          label="Maintenance mode"
          tone={health.maintenanceMode ? "warn" : "ok"}
        >
          {health.maintenanceMode ? "On — non-admins see the maintenance page" : "Off"}
        </Row>
      </CardContent>
    </Card>
  )
}

function OverallBanner({
  status,
  maintenance,
}: {
  status: "ok" | "warn" | "danger" | "maintenance" | "degraded"
  maintenance: boolean
}) {
  if (status === "ok") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-900">
        <CheckCircle2 className="size-3.5" />
        <span className="font-medium">All systems operational</span>
      </div>
    )
  }
  if (maintenance) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
        <Wrench className="size-3.5" />
        <span className="font-medium">Maintenance mode is on</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
      <AlertTriangle className="size-3.5" />
      <span className="font-medium">Degraded — see rows below</span>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: LucideIcon
  label: string
  tone: "ok" | "warn" | "danger" | "default"
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-brand-rule bg-brand-cream px-3 py-2 text-[12.5px]">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5",
            tone === "ok" && "text-emerald-700",
            tone === "warn" && "text-amber-700",
            tone === "danger" && "text-red-700"
          )}
        />
        <span className="text-brand-ink">{label}</span>
      </div>
      <span className="font-mono text-[12px] text-brand-ink">{children}</span>
    </div>
  )
}
