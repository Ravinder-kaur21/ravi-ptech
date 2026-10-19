"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  Check,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  FileCheck2,
  Navigation,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { updateLoadStatusAction } from "@/app/actions/tms"

interface LoadStatusStepperProps {
  loadId: string
  currentStatus: string
  canUpdateStatus?: boolean
}

const STAGES = [
  { id: "available", label: "Available", desc: "Awaiting dispatch" },
  { id: "dispatched", label: "Dispatched", desc: "Assigned to fleet" },
  { id: "in_transit", label: "In Transit", desc: "Rolling on highway" },
  { id: "delivered", label: "Delivered", desc: "Freight received" },
  { id: "completed", label: "Completed", desc: "Invoiced & settled" },
]

export function LoadStatusStepper({
  loadId,
  currentStatus,
  canUpdateStatus = true,
}: LoadStatusStepperProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const currentIndex = STAGES.findIndex((s) => s.id === currentStatus)
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex

  const nextStage =
    currentStatus === "dispatched"
      ? { target: "in_transit", label: "Mark In Transit" }
      : currentStatus === "in_transit"
        ? { target: "delivered", label: "Mark Delivered" }
        : null

  const handleAdvance = (targetStatus: string) => {
    startTransition(async () => {
      const res = await updateLoadStatusAction({
        loadId,
        status: targetStatus as any,
      })

      if (res.ok) {
        toast.success(`Load advanced to ${targetStatus.replace("_", " ")}`)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to advance status")
      }
    })
  }

  return (
    <div className="rounded-2xl border border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eee9df] dark:border-zinc-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
          <span className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f]">
            FREIGHT LIFECYCLE & MILESTONE TRACKER
          </span>
        </div>

        {canUpdateStatus && nextStage && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleAdvance(nextStage.target)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#d9622b] text-white hover:bg-[#c4531f] transition-all shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                <Navigation className="size-3" />
                <span>{nextStage.label}</span>
                <ArrowRight className="size-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Stepper Rail */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {STAGES.map((stage, idx) => {
          const isDone = idx < effectiveIndex
          const isCurrent = idx === effectiveIndex
          const isUpcoming = idx > effectiveIndex

          return (
            <div
              key={stage.id}
              className={cn(
                "flex flex-col p-2.5 rounded-xl border transition-all relative overflow-hidden",
                isCurrent
                  ? "border-[#d9622b] bg-[#fff0e6] dark:bg-orange-950/20 shadow-xs ring-1 ring-[#d9622b]/40"
                  : isDone
                    ? "border-[#d1ccc5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
                    : "border-transparent bg-[#f7f3ec]/60 dark:bg-zinc-900/20 opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-[#8a8b8f] font-semibold">
                  0{idx + 1}
                </span>

                <div
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[10px]",
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-[#d9622b] text-white animate-pulse"
                        : "bg-[#eee9df] dark:bg-zinc-800 text-[#8a8b8f]"
                  )}
                >
                  {isDone ? (
                    <Check className="size-3 stroke-[3]" />
                  ) : (
                    <span className="font-bold">•</span>
                  )}
                </div>
              </div>

              <span
                className={cn(
                  "text-xs font-semibold truncate",
                  isCurrent
                    ? "text-[#d9622b]"
                    : isDone
                      ? "text-[#16181d] dark:text-zinc-100"
                      : "text-[#8a8b8f]"
                )}
              >
                {stage.label}
              </span>

              <span className="text-[10px] text-[#8a8b8f] truncate mt-0.5">
                {stage.desc}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
