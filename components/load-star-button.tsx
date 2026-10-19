"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { sounds } from "@/lib/sound-effects"

export function StarButton({
  loadId,
  initial,
}: {
  loadId: string
  initial: boolean
}) {
  const [starred, setStarred] = React.useState(initial)
  const [hydrated, setHydrated] = React.useState(false)
  const qc = useQueryClient()

  // [LOAD-STAR] Defer to client so the prop value renders after hydration
  React.useEffect(() => setHydrated(true), [])

  const toggle = useMutation({
    mutationFn: async () => {
      const next = !starred
      const r = await fetch(`/api/loads/${loadId}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: next }),
      })
      if (!r.ok) throw new Error("Failed to toggle star")
      return next
    },
    onSuccess: (next) => {
      setStarred(next)
      console.log("[LOAD-STAR] toggled →", next)
      qc.invalidateQueries({ queryKey: ["sidebar-recent-loads"] })
      toast.success(next ? "Pinned to sidebar" : "Removed from sidebar")
    },
    onError: () => {
      toast.error("Couldn't update pin")
    },
  })

  if (!hydrated) {
    return <Skeleton className="size-9 rounded-full" />
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            onClick={() => {
              sounds.playPop()
              toggle.mutate()
            }}
            disabled={toggle.isPending}
            variant="outline"
            size="icon"
            aria-label={starred ? "Unpin from sidebar" : "Pin to sidebar"}
            className={cn(
              "h-9 w-9 rounded-full",
              starred
                ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/15"
                : "border-brand-rule text-brand-muted-soft hover:bg-brand-cream-soft hover:text-brand-ink"
            )}
          />
        }
      >
        <Star
          className={cn("size-4", starred && "fill-brand-accent")}
          strokeWidth={1.8}
        />
      </TooltipTrigger>
      <TooltipContent>
        {starred ? "Unpin from sidebar" : "Pin to sidebar"}
      </TooltipContent>
    </Tooltip>
  )
}
