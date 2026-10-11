import { Shield } from "lucide-react"
import { SecuritySettings } from "@/components/admin/security-settings"

export const instant = false

export default function AdminSecurityPage() {
  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            SECURITY
          </span>
          <span className="font-mono text-[10px] tracking-[0.04em] text-brand-muted-soft">
            · maintenance · ip · email · brute-force
          </span>
        </div>
        <h1 className="mt-2 font-serif text-[clamp(28px,3.5vw,40px)] leading-[1.05] tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Security</span>
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-brand-ink/70">
          Maintenance mode, IP allowlist, email allow/block lists, and the
          brute-force dashboard. Every change is written to the audit log.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <SecuritySettings />
      </div>
    </>
  )
}
