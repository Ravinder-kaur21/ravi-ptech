import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  available: {
    label: "Available",
    className: "bg-brand-success/10 text-brand-success border-brand-success/20",
    dot: "bg-brand-success",
  },
  booked: {
    label: "Booked",
    className: "bg-brand-accent/10 text-brand-accent border-brand-accent/20",
    dot: "bg-brand-accent",
  },
  dispatched: {
    label: "Dispatched",
    className: "bg-brand-accent/10 text-brand-accent border-brand-accent/20",
    dot: "bg-brand-accent",
  },
  in_transit: {
    label: "In transit",
    className: "bg-brand-ink/10 text-brand-ink border-brand-ink/20",
    dot: "bg-brand-ink",
  },
  delivered: {
    label: "Delivered",
    className: "bg-brand-success/10 text-brand-success border-brand-success/20",
    dot: "bg-brand-success",
  },
  completed: {
    label: "Completed",
    className: "bg-brand-success/10 text-brand-success border-brand-success/20",
    dot: "bg-brand-success",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-brand-muted/40 text-brand-muted-soft border-brand-rule",
    dot: "bg-brand-muted-soft/60",
  },
}

/**
 * Status pill for loads. Built on the shadcn Badge primitive, themed to
 * match the Muvx brand palette (success = green, accent = orange, ink = black).
 */
export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.available
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1.5 rounded-full px-2 font-mono text-[10px] font-medium uppercase tracking-[0.04em]",
        config.className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  )
}
