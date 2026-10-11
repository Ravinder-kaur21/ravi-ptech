import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type NextStep = {
  label: string
  href: string
  description: string
}

type PrimaryAction = {
  label: string
  href: string
}

/**
 * Placeholder page for TMS modules that aren't built yet.
 * Renders a "coming soon" card with the module's intent and a primary CTA.
 */
export function ModulePage({
  title,
  description,
  icon: Icon,
  primaryAction,
  emptyStateTitle,
  emptyStateDescription,
  nextSteps,
}: {
  title: string
  description: string
  icon: LucideIcon
  primaryAction?: PrimaryAction
  emptyStateTitle?: string
  emptyStateDescription?: string
  nextSteps?: NextStep[]
}) {
  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">{title}</span>
          </h1>
        </div>
        <p className="text-sm text-brand-ink/80">{description}</p>
      </div>

      <Card className="border-brand-rule bg-brand-card p-10 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
          <Icon className="h-5 w-5 text-brand-accent" />
        </div>
        {emptyStateTitle && (
          <p className="font-medium text-brand-ink">{emptyStateTitle}</p>
        )}
        {emptyStateDescription && (
          <p className="mt-1 text-sm text-brand-muted-soft max-w-md mx-auto">
            {emptyStateDescription}
          </p>
        )}
        {primaryAction && (
          <Button
            render={<Link href={primaryAction.href} />}
            className="mt-4 h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {primaryAction.label}
          </Button>
        )}
      </Card>

      {nextSteps && nextSteps.length > 0 && (
        <Card className="border-brand-rule bg-brand-card p-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft mb-3">
            Next steps
          </h2>
          <ul className="space-y-2.5">
            {nextSteps.map((s, i) => (
              <li key={i}>
                <Link
                  href={s.href}
                  className="flex items-start gap-2.5 rounded-lg p-2 -mx-2 hover:bg-brand-cream-soft transition-colors"
                >
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-brand-accent" />
                  <div>
                    <p className="text-sm font-medium text-brand-ink">{s.label}</p>
                    <p className="text-[11px] text-brand-muted-soft">{s.description}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
