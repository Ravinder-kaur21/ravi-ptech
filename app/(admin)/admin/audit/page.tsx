import { ScrollText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const instant = false

export default function AdminAuditPage() {
  console.log("[ADMIN/AUDIT] rendering")

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-[1400px]">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="size-[7px] shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            AUDIT LOG
          </span>
          <span className="font-mono text-[11px] tracking-[0.04em] text-brand-muted-soft">
            · V1 STUB · COMING SOON
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <ScrollText className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Audit log</span>
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-brand-ink/80">
          Every admin action — ban, impersonate, role change, org delete —
          written to an append-only table you can search, filter, and export.
        </p>
      </div>

      <Card className="border-brand-rule bg-brand-card p-6">
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            Phase 2
          </Badge>
          <p className="text-sm text-brand-ink/80">
            The audit pipeline ships in two parts: <br />
            <strong className="text-brand-ink">1.</strong> A new{" "}
            <code className="rounded bg-brand-cream-soft px-1 py-0.5 font-mono text-[12px]">
              audit_log
            </code>{" "}
            Drizzle table with append-only semantics. <br />
            <strong className="text-brand-ink">2.</strong> Wire-up hooks in{" "}
            <code className="rounded bg-brand-cream-soft px-1 py-0.5 font-mono text-[12px]">
              lib/auth.ts
            </code>{" "}
            (admin.after ban / unban / impersonate / remove / set-role /
            impersonate-stop) that append rows. <br />
            Until then, rely on the console logs (every admin call logs{" "}
            <code className="rounded bg-brand-cream-soft px-1 py-0.5 font-mono text-[12px]">
              [ADMIN-USERS]
            </code>{" "}
            or{" "}
            <code className="rounded bg-brand-cream-soft px-1 py-0.5 font-mono text-[12px]">
              [ADMIN-WORKSPACES]
            </code>{" "}
            prefixes) and the Better Auth{" "}
            <code className="rounded bg-brand-cream-soft px-1 py-0.5 font-mono text-[12px]">
              session.impersonatedBy
            </code>{" "}
            field.
          </p>
        </div>
      </Card>
    </div>
  )
}