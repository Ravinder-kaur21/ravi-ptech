import { Inbox } from "lucide-react"
import { getAdminStats, listOpenAppealsForAdmin } from "@/lib/dal"
import { AppealsTable } from "@/components/admin/appeals-table"

export const instant = false

type AppealRowOut = {
  id: string
  name: string | null
  email: string
  suspendedAt: Date | string | null
  suspendedUntil: Date | string | null
  suspendedReason: string | null
  appealMessage: string | null
  appealSubmittedAt: Date | string | null
  appealStatus: string | null
}

export default async function AdminAppealsPage() {
  console.log("[ADMIN/APPEALS] rendering")
  const [stats, rawAppeals] = await Promise.all([
    getAdminStats(),
    listOpenAppealsForAdmin(),
  ])
  const appeals: AppealRowOut[] = rawAppeals.map((a) => ({
    id: a.id as string,
    name: (a.name as string | null) ?? null,
    email: a.email as string,
    suspendedAt: (a.suspendedAt as Date | string | null) ?? null,
    suspendedUntil: (a.suspendedUntil as Date | string | null) ?? null,
    suspendedReason: (a.suspendedReason as string | null) ?? null,
    appealMessage: (a.appealMessage as string | null) ?? null,
    appealSubmittedAt: (a.appealSubmittedAt as Date | string | null) ?? null,
    appealStatus: (a.appealStatus as string | null) ?? null,
  }))
  console.log("[ADMIN/APPEALS]", appeals.length, "open appeals")

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-[1200px]">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="size-[7px] shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            APPEAL INBOX
          </span>
          <span className="font-mono text-[11px] tracking-[0.04em] text-brand-muted-soft">
            · {stats.openAppeals} OPEN · {stats.suspendedUsers} SUSPENDED
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Inbox className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Appeals</span>
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-brand-ink/80">
          Every appeal submitted by a suspended user. Approving lifts the
          suspension immediately; denying keeps it active but lets the user
          submit a fresh appeal with new context.
        </p>
      </div>

      <AppealsTable initialAppeals={appeals} />
    </div>
  )
}