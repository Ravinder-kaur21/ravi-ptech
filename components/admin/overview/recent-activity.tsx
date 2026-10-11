"use client"

/**
 * RecentActivity — last 20 admin actions, with HoverCard showing
 * the full metadata JSON. ScrollArea for long lists, Empty for
 * the zero-state.
 */
import * as React from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  Activity,
  ChevronRight,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

type Event = {
  id: string
  action: string
  actorEmail: string
  targetType: string
  targetLabel: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const ACTION_META: Record<string, { label: string; tone: "default" | "info" | "warn" | "danger" | "success" }> = {
  "user.ban": { label: "Ban", tone: "danger" },
  "user.unban": { label: "Unban", tone: "success" },
  "user.suspend": { label: "Suspend", tone: "warn" },
  "user.lift-suspension": { label: "Lift suspension", tone: "success" },
  "user.set-role": { label: "Set platform role", tone: "info" },
  "user.set-member-role": { label: "Set workspace role", tone: "info" },
  "user.invite-to-org": { label: "Invite to org", tone: "info" },
  "user.remove-from-org": { label: "Remove from org", tone: "danger" },
  "user.reset-password": { label: "Reset password", tone: "warn" },
  "user.force-verify-email": { label: "Force-verify email", tone: "info" },
  "user.remove": { label: "Remove user", tone: "danger" },
  "user.impersonate": { label: "Impersonate", tone: "info" },
  "appeal.resolve": { label: "Resolve appeal", tone: "default" },
  "org.delete": { label: "Delete org", tone: "danger" },
  "org.transfer-ownership": { label: "Transfer ownership", tone: "info" },
  "session.revoke": { label: "Revoke session", tone: "warn" },
  "session.revoke-all": { label: "Revoke all sessions", tone: "warn" },
  "system.maintenance": { label: "Maintenance", tone: "warn" },
  "system.announcement": { label: "Announcement", tone: "info" },
  "system.email-policy": { label: "Email policy", tone: "info" },
  "system.ip-allowlist": { label: "IP allowlist", tone: "info" },
  "feature-flag.update": { label: "Feature flag", tone: "info" },
}

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, tone: "default" as const }
}

function ToneBadge({ tone, children }: { tone: "default" | "info" | "warn" | "danger" | "success"; children: React.ReactNode }) {
  const cls =
    tone === "danger"
      ? "border-red-300 bg-red-50 text-red-900"
      : tone === "warn"
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : tone === "info"
          ? "border-blue-300 bg-blue-50 text-blue-900"
          : tone === "success"
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-brand-rule bg-brand-cream-soft text-brand-ink"
  return (
    <Badge variant="outline" className={cn("font-mono text-[9px] uppercase tracking-[0.04em]", cls)}>
      {children}
    </Badge>
  )
}

export function RecentActivity({
  events,
  loading,
}: {
  events: Event[]
  loading?: boolean
}) {
  console.log(`[OVERVIEW/ACTIVITY] rendering ${events.length} events`)
  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
              <Activity className="size-4 text-brand-accent" />
              Recent activity
            </CardTitle>
            <CardDescription className="text-[12px] text-brand-muted-soft">
              Last 20 admin actions across the platform. Audit log keeps
              the full history.
            </CardDescription>
          </div>
          <Link
            href="/admin/audit"
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft hover:text-brand-ink"
          >
            Open audit log
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Activity className="size-5" />
              </EmptyMedia>
              <EmptyTitle>No activity yet</EmptyTitle>
              <EmptyDescription>
                Every admin action you take will appear here in real time.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-[300px] pr-3">
            <ul className="space-y-1.5">
              {events.map((e) => {
                const meta = actionMeta(e.action)
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-2.5 rounded-md border border-brand-rule bg-brand-cream p-2.5"
                  >
                    <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-brand-ink">
                        <span className="font-mono text-[11px] text-brand-muted-soft">
                          {e.actorEmail}
                        </span>{" "}
                        on{" "}
                        <span className="font-medium">
                          {e.targetLabel ?? e.targetType}
                        </span>
                      </p>
                      <p className="font-mono text-[10px] text-brand-muted-soft">
                        {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <HoverCard>
                        <HoverCardTrigger
                          render={
                            <button className="rounded p-1 text-brand-muted-soft hover:bg-brand-card hover:text-brand-ink" />
                          }
                        >
                          <Activity className="size-3" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 border-brand-rule bg-brand-card font-mono text-[11px]">
                          <p className="mb-1 font-sans text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
                            Metadata
                          </p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-brand-ink">
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
