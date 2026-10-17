"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  History,
  ArrowLeft,
  Search,
  ShieldCheck,
  User,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react"

type AuditEvent = {
  id: string
  action: string
  actorEmail?: string
  actorId?: string
  targetType?: string
  targetId?: string
  targetLabel?: string
  metadata?: any
  createdAt: string
}

export function WorkspaceAuditClient() {
  const [filter, setFilter] = React.useState("")

  const { data, isLoading, refetch, isFetching } = useQuery<AuditEvent[]>({
    queryKey: ["workspace-audit-events"],
    queryFn: async () => {
      const res = await fetch("/api/settings/workspace-recent-events")
      if (!res.ok) throw new Error("Failed to load audit events")
      return res.json()
    },
  })

  const events = data ?? []
  const filtered = events.filter((e) => {
    if (!filter) return true
    const term = filter.toLowerCase()
    return (
      e.action.toLowerCase().includes(term) ||
      (e.actorEmail && e.actorEmail.toLowerCase().includes(term)) ||
      (e.targetLabel && e.targetLabel.toLowerCase().includes(term))
    )
  })

  return (
    <div className="px-4 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-brand-rule bg-brand-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent shrink-0">
              <History className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl tracking-tight text-brand-ink font-semibold">
                Workspace Audit Trail
              </h1>
              <p className="text-xs text-brand-muted-soft mt-1 max-w-xl leading-relaxed">
                Immutable record of all administrative actions, role modifications, profile updates, team invitations, and load cancellations across this workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs border-brand-rule text-brand-ink hover:bg-brand-cream/50 gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted-soft" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search action, user, or target..."
            className="h-9 pl-9 text-xs bg-brand-cream/30 border-brand-rule"
          />
        </div>
        <span className="text-xs text-brand-muted-soft font-mono">
          Showing {filtered.length} recent events
        </span>
      </div>

      {/* Audit Log Table */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-brand-muted-soft flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading audit events…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-muted-soft">
            No audit records matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-cream/40 border-b border-brand-rule text-brand-muted-soft font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-rule font-sans">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-cream/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-brand-ink">
                      <Badge variant="outline" className="border-brand-rule font-mono text-[10px] text-brand-ink">
                        {item.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-brand-ink">
                      {item.actorEmail || item.actorId || "System"}
                    </td>
                    <td className="py-3 px-4 text-brand-muted-soft">
                      {item.targetLabel || item.targetType || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-brand-muted-soft text-[11px]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Just now"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
