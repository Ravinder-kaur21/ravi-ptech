"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertOctagon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // [ERROR] Surface the error to the console for debugging
    console.error("[APP-ERROR]", error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertOctagon className="h-5 w-5 text-destructive" />
        </div>
        <h1 className="font-serif text-2xl tracking-tight text-brand-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-brand-ink/80">
          We hit an unexpected error. You can try again, or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            onClick={reset}
            className="h-9 px-4 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream text-sm"
          >
            Try again
          </Button>
          <Button
            render={<Link href="/dashboard" />}
            variant="outline"
            className="h-9 px-4 rounded-full text-sm"
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
