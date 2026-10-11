"use client"

/**
 * FeatureFlags — the /admin/flags page.
 *
 * Lists every flag, lets you:
 *   - create a new flag
 *   - edit rollout %, default value, description
 *   - set per-user / per-org overrides
 *
 * Each flag row expands to show its overrides + an "add override"
 * form. Overrides are auditable.
 */
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Flag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  Pencil,
  Check,
  X,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

type FlagRow = {
  key: string
  name: string
  description: string | null
  kind: "boolean" | "string" | "number"
  defaultValue: string
  rolloutPercent: number
  userOverrides: { userId: string; userEmail: string; value: string }[]
  orgOverrides: { orgId: string; orgName: string; value: string }[]
  updatedAt: string
}

export function FeatureFlags() {
  const queryClient = useQueryClient()
  const flagsQuery = useQuery({
    queryKey: ["admin-flags"],
    queryFn: async () => {
      const r = await fetch("/api/admin/feature-flags")
      if (!r.ok) throw new Error("Failed to load flags")
      return r.json() as Promise<{ flags: FlagRow[] }>
    },
  })

  const [createOpen, setCreateOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  function toggleExpand(key: string) {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            Feature flags
          </p>
          <p className="text-sm text-brand-ink">
            {flagsQuery.data?.flags.length ?? 0}{" "}
            {flagsQuery.data?.flags.length === 1 ? "flag" : "flags"} defined
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-9 bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
        >
          <Plus className="mr-1.5 size-3.5" />
          New flag
        </Button>
      </div>

      {flagsQuery.isLoading ? (
        <div className="flex justify-center py-12 text-brand-muted-soft">
          <Spinner className="size-4" />
        </div>
      ) : (flagsQuery.data?.flags.length ?? 0) === 0 ? (
        <Card className="border-brand-rule bg-brand-card">
          <CardContent className="py-12 text-center text-sm text-brand-muted-soft">
            No flags yet. Create your first one to gate a feature behind a
            rollout.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {flagsQuery.data!.flags.map((f) => (
            <FlagCard
              key={f.key}
              flag={f}
              expanded={expanded.has(f.key)}
              onToggle={() => toggleExpand(f.key)}
              onChanged={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-flags"] })
              }
            />
          ))}
        </div>
      )}

      <CreateFlagDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          queryClient.invalidateQueries({ queryKey: ["admin-flags"] })
        }}
      />
    </>
  )
}

function FlagCard({
  flag,
  expanded,
  onToggle,
  onChanged,
}: {
  flag: FlagRow
  expanded: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [rollout, setRollout] = React.useState(flag.rolloutPercent)
  const [defaultValue, setDefaultValue] = React.useState(flag.defaultValue)

  const update = useMutation({
    mutationFn: async (input: { rolloutPercent?: number; defaultValue?: string }) => {
      const r = await fetch(`/api/admin/feature-flags/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Updated")
      setEditing(false)
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/admin/feature-flags/${flag.key}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed")
      return r.json()
    },
    onSuccess: () => {
      toast.success("Flag deleted")
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const totalOverrides = flag.userOverrides.length + flag.orgOverrides.length

  return (
    <Card className="border-brand-rule bg-brand-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-brand-muted-soft" />
        ) : (
          <ChevronRight className="size-4 text-brand-muted-soft" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="rounded bg-brand-cream-soft px-1.5 py-0.5 font-mono text-[12px] text-brand-ink">
              {flag.key}
            </code>
            <span className="text-sm text-brand-ink">{flag.name}</span>
            <Badge
              variant="outline"
              className="font-mono text-[9px] uppercase tracking-[0.04em]"
            >
              {flag.kind}
            </Badge>
          </div>
          {flag.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-brand-muted-soft">
              {flag.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-brand-muted-soft">
          <span>
            <span className="font-mono text-brand-ink">{flag.rolloutPercent}%</span> rollout
          </span>
          {totalOverrides > 0 && (
            <Badge
              variant="outline"
              className="border-blue-300 bg-blue-50 font-mono text-[9px] uppercase tracking-[0.04em] text-blue-900"
            >
              {totalOverrides} override{totalOverrides === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-brand-rule px-4 py-4">
          {/* Edit rollout + default */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Rollout percentage
              </Label>
              {editing ? (
                <div className="flex items-center gap-3">
                  <Slider
                    value={rollout}
                    onValueChange={(v) =>
                      setRollout(typeof v === "number" ? v : (v as readonly number[])[0] ?? 0)
                    }
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-10 text-right font-mono text-[12px]">
                    {rollout}%
                  </span>
                </div>
              ) : (
                <div className="flex h-9 items-center gap-2 rounded-md border border-brand-rule bg-brand-cream px-3 text-sm">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-cream-soft">
                    <div
                      className="h-full bg-brand-accent"
                      style={{ width: `${flag.rolloutPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[12px] text-brand-ink">
                    {flag.rolloutPercent}%
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                Default value
              </Label>
              {editing ? (
                flag.kind === "boolean" ? (
                  <Select
                    value={defaultValue}
                    onValueChange={(v: string | null) => v && setDefaultValue(v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">true</SelectItem>
                      <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="h-9 font-mono text-[12px]"
                  />
                )
              ) : (
                <div className="flex h-9 items-center rounded-md border border-brand-rule bg-brand-cream px-3 font-mono text-[12px]">
                  {flag.defaultValue}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    update.mutate({ rolloutPercent: rollout, defaultValue })
                  }
                  disabled={update.isPending}
                  className="h-8 bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
                >
                  <Check className="mr-1 size-3" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false)
                    setRollout(flag.rolloutPercent)
                    setDefaultValue(flag.defaultValue)
                  }}
                  className="h-8"
                >
                  <X className="mr-1 size-3" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-8 border-brand-rule"
              >
                <Pencil className="mr-1 size-3" />
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete flag "${flag.key}"? Overrides are removed too.`)) {
                  remove.mutate()
                }
              }}
              className="h-8 text-brand-muted-soft hover:text-brand-accent"
            >
              <Trash2 className="mr-1 size-3" />
              Delete
            </Button>
          </div>

          {/* Overrides */}
          <div className="space-y-3">
            <OverrideSection
              flag={flag}
              kind="user"
              icon={Users}
              title="Per-user overrides"
              rows={flag.userOverrides}
              onChanged={onChanged}
            />
            <OverrideSection
              flag={flag}
              kind="org"
              icon={Building2}
              title="Per-org overrides"
              rows={flag.orgOverrides}
              onChanged={onChanged}
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function OverrideSection({
  flag,
  kind,
  icon: Icon,
  title,
  rows,
  onChanged,
}: {
  flag: FlagRow
  kind: "user" | "org"
  icon: LucideIcon
  title: string
  rows: { userId?: string; userEmail?: string; orgId?: string; orgName?: string; value: string }[]
  onChanged: () => void
}) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = React.useState(false)

  const remove = useMutation({
    mutationFn: async (input: { targetId: string }) => {
      const r = await fetch(
        `/api/admin/feature-flags/${flag.key}/overrides/${kind}?targetId=${encodeURIComponent(input.targetId)}`,
        { method: "DELETE" }
      )
      if (!r.ok) throw new Error("Failed")
      return r.json()
    },
    onSuccess: () => {
      toast.success("Override removed")
      onChanged()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="rounded-lg border border-brand-rule bg-brand-cream p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-brand-muted-soft" />
          <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            {title}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="h-7 text-brand-muted-soft hover:text-brand-ink"
        >
          <Plus className="mr-1 size-3" />
          Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-brand-muted-soft">No overrides.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li
              key={kind === "user" ? r.userId : r.orgId}
              className="flex items-center gap-2 rounded-md bg-brand-card px-2.5 py-1.5 text-[12px]"
            >
              <span className="flex-1 truncate">
                {kind === "user" ? r.userEmail : r.orgName}
              </span>
              <code className="rounded bg-brand-cream-soft px-1.5 py-0.5 font-mono text-[10px]">
                {r.value}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  remove.mutate({ targetId: (r.userId ?? r.orgId) as string })
                }
                className="size-6 text-brand-muted-soft hover:text-brand-accent"
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddOverrideDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        flag={flag}
        kind={kind}
        onAdded={onChanged}
      />
    </div>
  )
}

function AddOverrideDialog({
  open,
  onOpenChange,
  flag,
  kind,
  onAdded,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  flag: FlagRow
  kind: "user" | "org"
  onAdded: () => void
}) {
  const [targetId, setTargetId] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [options, setOptions] = React.useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [value, setValue] = React.useState(flag.kind === "boolean" ? "true" : "")

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch(
        `/api/admin/feature-flags/${flag.key}/overrides/${kind}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId, value }),
        }
      )
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Override added")
      onOpenChange(false)
      setTargetId("")
      setSearch("")
      setValue(flag.kind === "boolean" ? "true" : "")
      onAdded()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  React.useEffect(() => {
    if (!open) return
    if (search.trim().length < 2) {
      setOptions([])
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      const endpoint = kind === "user" ? "/api/admin/search" : "/api/admin/search-orgs"
      fetch(`${endpoint}?q=${encodeURIComponent(search)}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => {
          if (kind === "user") {
            setOptions(
              (d.users ?? []).map((u: any) => ({ value: u.id, label: u.email }))
            )
          } else {
            setOptions(
              (d.workspaces ?? []).map((o: any) => ({
                value: o.id,
                label: o.name,
              }))
            )
          }
        })
        .catch(() => setOptions([]))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [search, open, kind])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {kind === "user" ? "user" : "workspace"} override
          </DialogTitle>
          <DialogDescription>
            Overrides the rollout and default for this {kind}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{kind === "user" ? "User" : "Workspace"}</Label>
            <div className="space-y-1.5">
              <Input
                placeholder={`Search ${kind === "user" ? "by email" : "by name"}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
              {loading ? (
                <div className="flex items-center gap-2 text-[11px] text-brand-muted-soft">
                  <Spinner className="size-3" />
                  Searching…
                </div>
              ) : options.length > 0 ? (
                <Combobox
                  items={options}
                  value={targetId}
                  onValueChange={(v: string | null) => setTargetId(v ?? "")}
                >
                  <ComboboxTrigger className="h-9 w-full border border-brand-rule bg-brand-card text-[12px]">
                    <ComboboxValue placeholder="Pick from results…" />
                  </ComboboxTrigger>
                  <ComboboxContent className="border-brand-rule bg-brand-card">
                    <ComboboxList>
                      <ComboboxEmpty className="text-brand-muted-soft">
                        No matches
                      </ComboboxEmpty>
                      {options.map((o) => (
                        <ComboboxItem key={o.value} value={o.value}>
                          {o.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Value</Label>
            {flag.kind === "boolean" ? (
              <Select
                value={value}
                onValueChange={(v: string | null) => v && setValue(v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true (enabled)</SelectItem>
                  <SelectItem value="false">false (disabled)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 font-mono text-[12px]"
                placeholder={flag.kind === "number" ? "0" : "value"}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => add.mutate()}
            disabled={!targetId || !value || add.isPending}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
          >
            Add override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateFlagDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const [key, setKey] = React.useState("")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [kind, setKind] = React.useState<"boolean" | "string" | "number">("boolean")
  const [defaultValue, setDefaultValue] = React.useState("false")
  const [rollout, setRollout] = React.useState(0)

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          name: name.trim(),
          description: description.trim() || null,
          kind,
          defaultValue,
          rolloutPercent: rollout,
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Flag created")
      setKey("")
      setName("")
      setDescription("")
      setKind("boolean")
      setDefaultValue("false")
      setRollout(0)
      onCreated()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New feature flag</DialogTitle>
          <DialogDescription>
            Use snake_case for the key. Once created, you can set rollout %
            and add per-user / per-org overrides.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="new_dashboard"
              className="h-9 font-mono text-[12px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag-name">Name</Label>
            <Input
              id="flag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New dashboard redesign"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flag-desc">Description</Label>
            <Input
              id="flag-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this gate?"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={kind}
                onValueChange={(v: string | null) => v && setKind(v as typeof kind)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boolean">boolean</SelectItem>
                  <SelectItem value="string">string</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default</Label>
              {kind === "boolean" ? (
                <Select
                  value={defaultValue}
                  onValueChange={(v: string | null) => v && setDefaultValue(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  className="h-9 font-mono text-[12px]"
                />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Initial rollout</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={rollout}
                onValueChange={(v) =>
                  setRollout(typeof v === "number" ? v : (v as readonly number[])[0] ?? 0)
                }
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="w-10 text-right font-mono text-[12px]">{rollout}%</span>
            </div>
            <p className="font-mono text-[10px] text-brand-muted-soft">
              0% = off for everyone (overrides still work). 100% = default for everyone.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={
              !key.trim() ||
              !name.trim() ||
              !/^[a-z0-9_]+$/.test(key.trim()) ||
              create.isPending
            }
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
          >
            Create flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
