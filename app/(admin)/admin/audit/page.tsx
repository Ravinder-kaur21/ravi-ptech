import { ScrollText } from "lucide-react"
import { AuditTable } from "@/components/admin/audit-table"

export const instant = false

export default function AdminAuditPage() {
  console.log("[ADMIN/AUDIT] rendering")

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            AUDIT LOG
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · every admin action · hash-chained
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Audit log</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          Every ban, suspension, role change, impersonation, and org delete —
          written to an append-only table with a SHA-256 hash chain so any
          tampering is detectable. Filter, search, and export.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <AuditTable />
      </div>
    </>
  )
}
