import { Globe, ShieldOff, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function IpBlockedScreen({
  ip,
  totalEntries,
}: {
  ip: string | null
  totalEntries: number
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <Card className="w-full max-w-lg border-brand-rule bg-brand-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-100 text-red-900">
              <ShieldOff className="size-4" />
            </div>
            <Badge
              variant="outline"
              className="border-red-300 bg-red-50 font-mono text-[10px] uppercase tracking-[0.04em] text-red-900"
            >
              IP blocked
            </Badge>
          </div>
          <CardTitle className="mt-3 font-serif text-2xl tracking-tight text-brand-ink">
            Your IP is not on the admin allowlist.
          </CardTitle>
          <CardDescription className="text-[13px] text-brand-ink/70">
            The /admin console is restricted to a curated set of IPs. If you
            believe this is a mistake, ask another admin to add your
            current IP to the list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-[12.5px]">
          <div className="flex items-center gap-2 rounded-md border border-brand-rule bg-brand-cream px-3 py-2 font-mono">
            <Globe className="size-3.5 text-brand-muted-soft" />
            <span className="text-brand-ink">{ip ?? "Unknown IP"}</span>
            <span className="ml-auto text-brand-muted-soft">
              {totalEntries} allowlist {totalEntries === 1 ? "entry" : "entries"}
            </span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-brand-muted-soft hover:text-brand-ink"
          >
            <ArrowLeft className="size-3" />
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
