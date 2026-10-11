"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"

export function AppealForm({
  defaultMessage,
  resubmit = false,
}: {
  defaultMessage: string
  resubmit?: boolean
}) {
  const router = useRouter()
  const [message, setMessage] = React.useState(defaultMessage)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim().length < 20) {
      toast.error("Tell us a bit more — at least 20 characters.")
      return
    }
    console.log("[APPEAL] submitting")
    setSubmitting(true)
    try {
      const r = await fetch("/api/me/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed to submit appeal")
      }
      console.log("[APPEAL] ✅ submitted")
      toast.success("Appeal submitted — we'll review and email you back.")
      router.refresh()
    } catch (err) {
      console.error("[APPEAL] submit failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Explain your side. Include any context that would help an admin reconsider."
        rows={5}
        className="resize-none"
        required
        minLength={20}
        maxLength={2000}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-muted-soft">
          {message.length}/2000
        </p>
        <Button
          type="submit"
          disabled={submitting || message.trim().length < 20}
          className="h-9 rounded-full bg-brand-ink px-5 text-sm font-medium text-brand-cream hover:bg-brand-ink-soft"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="mr-2 size-3.5" />
              {resubmit ? "Update appeal" : "Submit appeal"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}