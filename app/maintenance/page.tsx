import { Wrench } from "lucide-react"
import { getMaintenanceSnapshot } from "@/lib/request-gate"
import { formatWorkspaceDate, DEFAULT_TIMEZONE } from "@/lib/timezone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function MaintenancePage() {
  console.log("[MAINTENANCE-PAGE] rendering")
  const snap = await getMaintenanceSnapshot()
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <Card className="w-full max-w-lg border-brand-rule bg-brand-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-ink text-brand-cream">
              <Wrench className="size-4" />
            </div>
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-50 font-mono text-[10px] uppercase tracking-[0.04em] text-amber-900"
            >
              Maintenance in progress
            </Badge>
          </div>
          <CardTitle className="mt-3 font-serif text-2xl tracking-tight text-brand-ink">
            We&apos;ll be right back.
          </CardTitle>
          <CardDescription className="text-[13px] text-brand-ink/70">
            {snap.message ??
              "Muvx is undergoing scheduled maintenance. Sign back in a few minutes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-[12px] text-brand-muted-soft">
          {snap.startedAt && (
            <p>
              Started{" "}
              {formatWorkspaceDate(
                new Date(snap.startedAt),
                DEFAULT_TIMEZONE,
              )}
            </p>
          )}
          {snap.startedByEmail && (
            <p>
              By <span className="font-mono">{snap.startedByEmail}</span>
            </p>
          )}
          {snap.endsAt && (
            <p>
              Scheduled to end{" "}
              {formatWorkspaceDate(
                new Date(snap.endsAt),
                DEFAULT_TIMEZONE,
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
