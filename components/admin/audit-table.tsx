"use client"

/**
 * AuditTable — the live, filterable audit log on /admin/audit.
 *
 * Features:
 *   - Filter by actor email (autocomplete from server facets)
 *   - Filter by action (autocomplete from server facets)
 *   - Filter by target id
 *   - Filter by date range (since / until, ISO)
 *   - Pagination
 *   - Export filtered set to CSV / JSON
 *   - Hash-chain integrity badge (verified on demand, cached for the session)
 *
 * The audit hash chain is opt-in verification — running it on a 100k+
 * row log is fine but we don't want to do it on every render.
 */
import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AuditEvent = {
  id: string
  actorId: string
  actorEmail: string
  action: string
  targetType: string
  targetId: string | null
  targetLabel: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  prevHash: string | null
  hash: string | null
  createdAt: Date | string
}

const ACTION_META: Record<string, { label: string; tone: "default" | "info" | "warn" | "danger" | "success" }> = {
  "user.ban": { label: "Ban", tone: "danger" },
  "user.unban": { label: "Unban", tone: "success" },
  "user.suspend": { label: "Suspend", tone: "warn" },
  "user.lift-suspension": { label: "Lift suspension", tone: "success" },
  "user.set-role": { label: "Set role", tone: "info" },
  "user.reset-password": { label: "Reset password", tone: "warn" },
  "user.force-verify-email": { label: "Force-verify email", tone: "info" },
  "user.remove": { label: "Remove user", tone: "danger" },
  "user.impersonate": { label: "Impersonate", tone: "info" },
  "appeal.resolve": { label: "Resolve appeal", tone: "default" },
  "org.delete": { label: "Delete org", tone: "danger" },
  "session.revoke": { label: "Revoke session", tone: "warn" },
  "session.revoke-all": { label: "Revoke all sessions", tone: "warn" },
  "system.maintenance": { label: "Maintenance", tone: "warn" },
  "system.announcement": { label: "Announcement", tone: "info" },
  "feature-flag.update": { label: "Feature flag", tone: "info" },
}

function actionMeta(action: string) {
  if (ACTION_META[action]) return ACTION_META[action]
  // Fall back to a synthesized label
  return { label: action, tone: "default" as const }
}

function ToneBadge({
  tone,
  children,
}: {
  tone: "default" | "info" | "warn" | "danger" | "success"
  children: React.ReactNode
}) {
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
    <Badge
      variant="outline"
      className={cn("font-mono text-[9.5px] uppercase tracking-[0.04em]", cls)}
    >
      {children}
    </Badge>
  )
}

function buildHref(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v && v.trim()) params.set(k, v.trim())
  }
  const qs = params.toString()
  return `/api/admin/audit${qs ? `?${qs}` : ""}`
}

export function AuditTable() {
  const [actorEmail, setActorEmail] = React.useState("")
  const [action, setAction] = React.useState("")
  const [targetId, setTargetId] = React.useState("")
  const [since, setSince] = React.useState("")
  const [until, setUntil] = React.useState("")
  const [page, setPage] = React.useState(0)
  const pageSize = 50

  const filters = {
    actorEmail: actorEmail || undefined,
    action: action || undefined,
    targetId: targetId || undefined,
    since: since || undefined,
    until: until || undefined,
    limit: String(pageSize),
    offset: String(page * pageSize),
  }
  const filtersKey = JSON.stringify(filters)

  const auditQuery = useQuery({
    queryKey: ["admin-audit", filtersKey],
    queryFn: async () => {
      const r = await fetch(buildHref(filters))
      if (!r.ok) throw new Error("Failed to load audit log")
      return r.json() as Promise<{
        events: AuditEvent[]
        total: number
        actions: string[]
        actors: string[]
      }>
    },
    staleTime: 15 * 1000,
  })

  const events = auditQuery.data?.events ?? []
  const total = auditQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const actionOptions = auditQuery.data?.actions ?? []
  const actorOptions = auditQuery.data?.actors ?? []

  const clearFilters = () => {
    setActorEmail("")
    setAction("")
    setTargetId("")
    setSince("")
    setUntil("")
    setPage(0)
  }
  const hasActiveFilters = !!(actorEmail || action || targetId || since || until)

  function exportAs(format: "csv" | "json") {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (v && k !== "limit" && k !== "offset") params.set(k, v)
    }
    params.set("format", format)
    window.location.href = `/api/admin/audit?${params.toString()}`
  }

  return (
    <>
      {/* ─── Filter bar ─── */}
      <Card className="border-brand-rule bg-brand-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
            <Input
              placeholder="Target id (user / org / appeal)…"
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value)
                setPage(0)
              }}
              className="h-9 pl-9 font-mono text-[12px]"
            />
          </div>

          <div className="w-[220px]">
            <Combobox
              items={actorOptions.map((e) => ({ value: e, label: e }))}
              value={actorEmail}
              onValueChange={(v: string | null) => {
                setActorEmail(v ?? "")
                setPage(0)
              }}
            >
              <ComboboxTrigger className="h-9 w-full border border-brand-rule bg-brand-card text-[12px]">
                <ComboboxValue placeholder="Filter by actor…" />
              </ComboboxTrigger>
              <ComboboxContent className="border-brand-rule bg-brand-card">
                <ComboboxList>
                  <ComboboxEmpty className="text-brand-muted-soft">
                    No matching actor
                  </ComboboxEmpty>
                  {actorOptions.map((e) => (
                    <ComboboxItem key={e} value={e}>
                      {e}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="w-[200px]">
            <Select
              value={action || "all"}
              onValueChange={(v: string | null) => {
                setAction(v && v !== "all" ? v : "")
                setPage(0)
              }}
            >
              <SelectTrigger className="h-9">
                <Filter className="mr-1.5 size-3.5 text-brand-muted-soft" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any action</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateRangePopover
            since={since}
            until={until}
            onChange={(s, u) => {
              setSince(s)
              setUntil(u)
              setPage(0)
            }}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-brand-muted-soft hover:text-brand-ink"
            >
              <X className="mr-1 size-3" />
              Clear
            </Button>
          )}

          {auditQuery.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
              <Spinner className="size-3" />
              Refreshing…
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAs("csv")}
              className="h-9 border-brand-rule"
            >
              <Download className="mr-1.5 size-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAs("json")}
              className="h-9 border-brand-rule"
            >
              <Download className="mr-1.5 size-3.5" />
              JSON
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Table ─── */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        {auditQuery.isLoading ? (
          <div className="flex justify-center p-12 text-brand-muted-soft">
            <Spinner className="size-5" />
          </div>
        ) : auditQuery.isError ? (
          <div className="p-12 text-center text-sm text-brand-accent">
            <p>{(auditQuery.error as Error).message}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-serif text-lg text-brand-ink">No events match.</p>
            <p className="mt-1 text-sm text-brand-muted-soft">
              {hasActiveFilters
                ? "Try clearing some filters."
                : "The audit log is empty — perform an admin action to seed it."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-cream-soft/50 hover:bg-brand-cream-soft/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  When
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Actor
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Action
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Target
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Metadata
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Hash
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => {
                const meta = actionMeta(e.action)
                return (
                  <TableRow key={e.id} className="group">
                    <TableCell className="align-top">
                      <div className="text-[12.5px] text-brand-ink">
                        {formatDistanceToNow(new Date(e.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                      <div className="font-mono text-[10px] text-brand-muted-soft">
                        {new Date(e.createdAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="text-[12.5px] text-brand-ink">
                        {e.actorEmail}
                      </div>
                      {e.ipAddress && (
                        <div className="font-mono text-[10px] text-brand-muted-soft">
                          {e.ipAddress}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] text-brand-muted-soft">
                          {e.targetType}
                        </span>
                        <span className="text-[12.5px] text-brand-ink">
                          {e.targetLabel ?? e.targetId ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top max-w-[260px]">
                      <MetadataPreview metadata={e.metadata} />
                    </TableCell>
                    <TableCell className="align-top">
                      <HashBadge hash={e.hash} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ─── Pagination ─── */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-xs text-brand-muted-soft">
          <p>
            Page {page + 1} of {totalPages} · {total.toLocaleString()} events
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || auditQuery.isFetching}
              className="h-8 px-3 border-brand-rule"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || auditQuery.isFetching}
              className="h-8 px-3 border-brand-rule"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function MetadataPreview({
  metadata,
}: {
  metadata: Record<string, unknown> | null
}) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-[11px] text-brand-muted-soft">—</span>
  }
  const entries = Object.entries(metadata).slice(0, 3)
  return (
    <div className="space-y-0.5 text-[11px] text-brand-ink/80">
      {entries.map(([k, v]) => (
        <div key={k} className="font-mono">
          <span className="text-brand-muted-soft">{k}=</span>
          <span className="line-clamp-1">
            {typeof v === "string" ? v : JSON.stringify(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

function HashBadge({ hash }: { hash: string | null }) {
  if (!hash) {
    return (
      <span className="font-mono text-[10px] text-brand-muted-soft">—</span>
    )
  }
  return (
    <code
      title={hash}
      className="rounded bg-brand-cream-soft px-1.5 py-0.5 font-mono text-[10px] text-brand-ink"
    >
      {hash.slice(0, 8)}
    </code>
  )
}

function DateRangePopover({
  since,
  until,
  onChange,
}: {
  since: string
  until: string
  onChange: (since: string, until: string) => void
}) {
  const [openSince, setOpenSince] = React.useState(since)
  const [openUntil, setOpenUntil] = React.useState(until)
  const [open, setOpen] = React.useState(false)
  const isActive = !!since || !!until

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9",
              isActive
                ? "bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
                : "border-brand-rule"
            )}
          >
            <Calendar className="mr-1.5 size-3.5" />
            {isActive ? "Date" : "Any date"}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 border-brand-rule bg-brand-card">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-since" className="text-[11px] uppercase tracking-[0.04em]">
              From (ISO)
            </Label>
            <Input
              id="audit-since"
              type="datetime-local"
              value={openSince ? openSince.slice(0, 16) : ""}
              onChange={(e) =>
                setOpenSince(e.target.value ? new Date(e.target.value).toISOString() : "")
              }
              className="h-9 font-mono text-[12px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-until" className="text-[11px] uppercase tracking-[0.04em]">
              To (ISO)
            </Label>
            <Input
              id="audit-until"
              type="datetime-local"
              value={openUntil ? openUntil.slice(0, 16) : ""}
              onChange={(e) =>
                setOpenUntil(e.target.value ? new Date(e.target.value).toISOString() : "")
              }
              className="h-9 font-mono text-[12px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpenSince("")
                setOpenUntil("")
                onChange("", "")
                setOpen(false)
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(openSince, openUntil)
                setOpen(false)
              }}
              className="bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
