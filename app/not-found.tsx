import Link from "next/link"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-4">
          <Compass className="h-5 w-5 text-brand-accent" />
        </div>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          404 · not found
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-brand-ink">
          <span className="italic text-brand-accent">Wrong turn</span>
        </h1>
        <p className="mt-2 text-sm text-brand-ink/80">
          We couldn&apos;t find that page. It may have been moved, or the link
          could be off.
        </p>
        <Button
          render={<Link href="/dashboard" />}
          className="mt-6 h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm"
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
