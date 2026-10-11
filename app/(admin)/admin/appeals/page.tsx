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
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            APPEAL INBOX
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · {stats.openAppeals} open · {stats.suspendedUsers} suspended
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Appeals</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          Every appeal submitted by a suspended user. Approving lifts the
          suspension immediately; denying keeps it active but lets the user
          submit a fresh appeal with new context.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <AppealsTable initialAppeals={appeals} />
      </div>
    </>
  )
}
