"use client"

import * as React from "react"
import { CheckCircle2, XCircle, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { updateTripStatusAction } from "@/app/actions/tms"

interface TripStatusUpdaterProps {
  tripId: string
  currentStatus: string
}

export function TripStatusUpdater({ tripId, currentStatus }: TripStatusUpdaterProps) {
  const [loading, setLoading] = React.useState(false)

  const handleUpdate = async (newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    setLoading(true)
    try {
      const res = await updateTripStatusAction({ tripId, status: newStatus })
      if (res.ok) {
        toast.success(`Trip status updated to ${newStatus}`)
      } else {
        toast.error(res.error || "Failed to update status")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update trip")
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" />
        Delivered
      </span>
    )
  }

  if (currentStatus === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
        <XCircle className="size-3.5" />
        Cancelled
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {currentStatus === "pending" && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handleUpdate("in_progress")}
          className="h-7 px-2 text-[11px] gap-1 border-brand-rule hover:border-brand-accent/50"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3 text-brand-accent" />}
          Start Run
        </Button>
      )}
      {currentStatus === "in_progress" && (
        <Button
          size="sm"
          disabled={loading}
          onClick={() => handleUpdate("completed")}
          className="h-7 px-2.5 text-[11px] rounded-4xl gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
          Complete Delivery
        </Button>
      )}
    </div>
  )
}
