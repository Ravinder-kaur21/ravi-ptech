import { Megaphone } from "lucide-react"
import { Communications } from "@/components/admin/communications"

export const instant = false

export default function AdminCommsPage() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            COMMUNICATIONS
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · announcements · broadcasts · email log
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Communications</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          In-app banners, one-shot email broadcasts, and a complete log of
          every transactional email we've sent. Audit-logged and reversible
          (except for sent emails).
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <Communications />
      </div>
    </>
  )
}
