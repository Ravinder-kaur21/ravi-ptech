import { Flag } from "lucide-react"
import { FeatureFlags } from "@/components/admin/feature-flags"

export const instant = false

export default function AdminFlagsPage() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            FEATURE FLAGS
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · rollout · overrides · audit
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Feature flags</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          Gate features behind a flag. Roll out gradually with a percentage,
          pin specific users on or off, or set a workspace-wide default.
          Every change is logged to the audit log.
        </p>
      </div>

      <div className="space-y-4 px-4 lg:px-6">
        <FeatureFlags />
      </div>
    </>
  )
}
