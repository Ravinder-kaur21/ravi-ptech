"use client"

/**
 * UserActionsBar — small horizontal action chip group used in the
 * users table to open the detail sheet with a one-click affordance.
 */
import * as React from "react"
import { Eye, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function UserActionsBar({
  onView,
  className,
}: {
  onView: () => void
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onView}
      className={cn("h-8 px-2 text-brand-muted-soft hover:text-brand-ink", className)}
    >
      <Eye className="mr-1 size-3.5" />
      View
      <ChevronRight className="ml-0.5 size-3" />
    </Button>
  )
}
