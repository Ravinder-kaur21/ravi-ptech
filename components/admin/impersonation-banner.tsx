"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, X } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

/**
 * Sticky banner shown at the top of every page while an admin is impersonating
 * a user. Calls Better Auth's `admin.stopImpersonating()` to return to the
 * original admin session.
 */
export function ImpersonationBanner({
  impersonatedByEmail,
}: {
  impersonatedByEmail: string
}) {
  const router = useRouter()
  const [stopping, setStopping] = React.useState(false)

  const handleStop = async () => {
    console.log("[IMPERSONATION] stopping impersonation")
    setStopping(true)
    try {
      await authClient.admin.stopImpersonating()
      console.log("[IMPERSONATION] ✅ stopped")
      toast.success("Returned to your admin session")
      // Hard reload to clear impersonation-bound caches everywhere.
      window.location.href = "/admin"
    } catch (err) {
      console.error("[IMPERSONATION] stop failed:", err)
      toast.error("Failed to stop impersonating")
      setStopping(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-amber-950">
      <div className="flex items-center gap-2.5 text-sm">
        <Eye className="size-4 shrink-0" />
        <span className="font-medium">
          Impersonation active
        </span>
        <span className="text-amber-900/70">
          you are viewing Muvx as another user
        </span>
      </div>
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1 text-[12px] font-medium text-amber-50 hover:bg-amber-950 transition-colors disabled:opacity-50"
      >
        {stopping ? (
          <>
            <Spinner className="size-3" />
            Stopping…
          </>
        ) : (
          <>
            <X className="size-3" />
            Stop impersonating
          </>
        )}
      </button>
    </div>
  )
}