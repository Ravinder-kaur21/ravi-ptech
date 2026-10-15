"use client"

/**
 * Communications — the /admin/comms page.
 *
 * Three sections:
 *   1. Announcements — in-app banners (create / schedule / scope)
 *   2. Broadcasts    — one-shot email to a segment (compose + send + history)
 *   3. Email log     — every transactional email we sent (debug "did they get it?")
 */
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  Megaphone,
  Mail,
  Inbox,
  Plus,
  Trash2,
  Send,
  Check,
  X,
  Pencil,
  PowerOff,
  Power,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import { cn } from "@/lib/utils"
import { useWorkspaceDate } from "@/lib/timezone"

export function Communications() {
  return (
    <Tabs defaultValue="announcements" className="w-full">
      <TabsList className="inline-flex h-9 border-brand-rule bg-brand-card">
        <TabsTrigger value="announcements">
          <Megaphone className="mr-1.5 size-3.5" />
          Announcements
        </TabsTrigger>
        <TabsTrigger value="broadcasts">
          <Mail className="mr-1.5 size-3.5" />
          Broadcasts
        </TabsTrigger>
        <TabsTrigger value="log">
          <Inbox className="mr-1.5 size-3.5" />
          Email log
        </TabsTrigger>
      </TabsList>
      <TabsContent value="announcements" className="mt-4">
        <AnnouncementsSection />
      </TabsContent>
      <TabsContent value="broadcasts" className="mt-4">
        <BroadcastsSection />
      </TabsContent>
      <TabsContent value="log" className="mt-4">
        <EmailLogSection />
      </TabsContent>
    </Tabs>
  )
}

// ─── Announcements ─────────────────────────────────────────────────────────

type Announcement = {
  id: string
  title: string
  body: string
  kind: "info" | "warn" | "success" | "maintenance"
  /** "global" reaches every user. "admins_only" is platform-admin only.
   *  Org-scoped banners are a workspace-side feature (out of scope here). */
  scope: "global" | "admins_only"
  organizationId: string | null
  organizationName: string | null
  dismissible: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  active: boolean
}

function AnnouncementsSection() {
  const { formatDate } = useWorkspaceDate()
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const r = await fetch("/api/admin/announcements")
      if (!r.ok) throw new Error("Failed")
      return r.json() as Promise<{ announcements: Announcement[] }>
    },
  })

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Announcement | null>(null)

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed")
      return r.json()
    },
    onSuccess: () => {
      toast.success("Removed")
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            In-app banners
          </p>
          <p className="text-sm text-brand-ink">
            {list.data?.announcements.length ?? 0} total
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-9 bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
        >
          <Plus className="mr-1.5 size-3.5" />
          New announcement
        </Button>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-12 text-brand-muted-soft">
          <Spinner className="size-4" />
        </div>
      ) : (list.data?.announcements.length ?? 0) === 0 ? (
        <Card className="border-brand-rule bg-brand-card">
          <CardContent className="py-12 text-center text-sm text-brand-muted-soft">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-cream-soft/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Title
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Scope
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Kind
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Window
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Status
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data!.announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="min-w-0 max-w-[400px]">
                      <p className="truncate text-sm font-medium text-brand-ink">
                        {a.title}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-brand-muted-soft">
                        {a.body}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] uppercase tracking-[0.04em]"
                    >
                      {a.scope === "admins_only" ? "Admins only" : "All users"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-[0.04em]",
                        a.kind === "warn" &&
                          "border-amber-300 bg-amber-50 text-amber-900",
                        a.kind === "success" &&
                          "border-emerald-300 bg-emerald-50 text-emerald-900",
                        a.kind === "maintenance" &&
                          "border-brand-ink bg-brand-ink text-brand-cream",
                        a.kind === "info" &&
                          "border-blue-300 bg-blue-50 text-blue-900"
                      )}
                    >
                      {a.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-brand-muted-soft">
                    {a.startsAt || a.endsAt ? (
                      <>
                        {a.startsAt
                          ? formatDate(new Date(a.startsAt))
                          : "now"}
                        {" → "}
                        {a.endsAt
                          ? formatDate(new Date(a.endsAt))
                          : "∞"}
                      </>
                    ) : (
                      "always"
                    )}
                  </TableCell>
                  <TableCell>
                    {a.active ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 font-mono text-[9px] uppercase tracking-[0.04em] text-emerald-900"
                      >
                        active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-brand-rule bg-brand-cream-soft font-mono text-[9px] uppercase tracking-[0.04em] text-brand-muted-soft"
                      >
                        scheduled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(a)}
                        className="size-7 text-brand-muted-soft hover:text-brand-ink"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Remove "${a.title}"?`)) remove.mutate(a.id)
                        }}
                        className="size-7 text-brand-muted-soft hover:text-brand-accent"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AnnouncementDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setCreateOpen(false)
          queryClient.invalidateQueries({ queryKey: ["admin-announcements"] })
        }}
      />
      <AnnouncementDialog
        open={editing !== null}
        existing={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => {
          setEditing(null)
          queryClient.invalidateQueries({ queryKey: ["admin-announcements"] })
        }}
      />
    </>
  )
}

function AnnouncementDialog({
  open,
  onOpenChange,
  onSaved,
  existing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: () => void
  existing?: Announcement | null
}) {
  const [title, setTitle] = React.useState(existing?.title ?? "")
  const [body, setBody] = React.useState(existing?.body ?? "")
  const [kind, setKind] = React.useState<Announcement["kind"]>(existing?.kind ?? "info")
  const [scope, setScope] = React.useState<Announcement["scope"]>(existing?.scope ?? "global")
  const [dismissible, setDismissible] = React.useState(existing?.dismissible ?? true)
  const [startsAt, setStartsAt] = React.useState(
    existing?.startsAt ? existing.startsAt.slice(0, 16) : ""
  )
  const [endsAt, setEndsAt] = React.useState(
    existing?.endsAt ? existing.endsAt.slice(0, 16) : ""
  )

  React.useEffect(() => {
    if (open) {
      setTitle(existing?.title ?? "")
      setBody(existing?.body ?? "")
      setKind(existing?.kind ?? "info")
      setScope(existing?.scope ?? "global")
      setDismissible(existing?.dismissible ?? true)
      setStartsAt(existing?.startsAt ? existing.startsAt.slice(0, 16) : "")
      setEndsAt(existing?.endsAt ? existing.endsAt.slice(0, 16) : "")
    }
  }, [open, existing])

  const save = useMutation({
    mutationFn: async () => {
      const url = existing
        ? `/api/admin/announcements/${existing.id}`
        : "/api/admin/announcements"
      const method = existing ? "PATCH" : "POST"
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          kind,
          scope,
          dismissible,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success(existing ? "Updated" : "Created")
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit announcement" : "New announcement"}
          </DialogTitle>
          <DialogDescription>
            Renders at the top of the dashboard. Respects scope and the
            start/end window.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Heads up — maintenance Saturday"
              className="h-9"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Briefly explain what users need to know."
              rows={3}
              className="resize-none"
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={(v: string | null) => v && setKind(v as Announcement["kind"])}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">info</SelectItem>
                  <SelectItem value="warn">warn</SelectItem>
                  <SelectItem value="success">success</SelectItem>
                  <SelectItem value="maintenance">maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select
                value={scope}
                onValueChange={(v: string | null) => v && setScope(v as Announcement["scope"])}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">All users</SelectItem>
                  <SelectItem value="admins_only">Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Starts (optional)</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ends (optional)</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-brand-rule bg-brand-cream px-3 py-2">
            <Label className="text-[12px]">Users can dismiss</Label>
            <Switch checked={dismissible} onCheckedChange={setDismissible} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!title.trim() || !body.trim() || save.isPending}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
          >
            {existing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Broadcasts ────────────────────────────────────────────────────────────

type Broadcast = {
  id: string
  subject: string
  body: string
  audience: string
  audienceSize: number
  sentCount: number
  failedCount: number
  sentAt: string
  sentByEmail: string
}

function BroadcastsSection() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: async () => {
      const r = await fetch("/api/admin/broadcasts")
      if (!r.ok) throw new Error("Failed")
      return r.json() as Promise<{ broadcasts: Broadcast[] }>
    },
  })
  const [composeOpen, setComposeOpen] = React.useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
            One-shot email
          </p>
          <p className="text-sm text-brand-ink">
            {list.data?.broadcasts.length ?? 0} sent
          </p>
        </div>
        <Button
          onClick={() => setComposeOpen(true)}
          className="h-9 bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
        >
          <Send className="mr-1.5 size-3.5" />
          Compose broadcast
        </Button>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-12 text-brand-muted-soft">
          <Spinner className="size-4" />
        </div>
      ) : (list.data?.broadcasts.length ?? 0) === 0 ? (
        <Card className="border-brand-rule bg-brand-card">
          <CardContent className="py-12 text-center text-sm text-brand-muted-soft">
            No broadcasts yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-brand-rule bg-brand-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-cream-soft/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Subject
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Audience
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Sent / Failed
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  When
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  By
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data!.broadcasts.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="text-sm font-medium text-brand-ink">{b.subject}</p>
                    <p className="line-clamp-1 text-[11px] text-brand-muted-soft">
                      {b.body.slice(0, 80)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] uppercase tracking-[0.04em]"
                    >
                      {b.audience}
                    </Badge>
                    <span className="ml-2 text-[11px] text-brand-muted-soft">
                      {b.audienceSize.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[12px]">
                      <span className="text-emerald-700">{b.sentCount}</span>
                      {" / "}
                      <span className={b.failedCount > 0 ? "text-red-700" : "text-brand-muted-soft"}>
                        {b.failedCount}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-brand-muted-soft">
                    {formatDistanceToNow(new Date(b.sentAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-[12px]">{b.sentByEmail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ComposeBroadcastDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => {
          setComposeOpen(false)
          queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] })
        }}
      />
    </>
  )
}

function ComposeBroadcastDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSent: () => void
}) {
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [audience, setAudience] = React.useState<"all" | "active_30d" | "admins">("all")

  React.useEffect(() => {
    if (open) {
      setSubject("")
      setBody("")
      setAudience("all")
    }
  }, [open])

  const send = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, audience }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Send failed")
      }
      return r.json()
    },
    onSuccess: (d) => {
      toast.success(`Sent to ${d.sent} · ${d.failed} failed`)
      onSent()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose broadcast</DialogTitle>
          <DialogDescription>
            Sends one email per recipient through Resend. This cannot be
            unsent — double-check the audience and copy.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's new this week"
              className="h-9"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select
              value={audience}
              onValueChange={(v: string | null) => v && setAudience(v as typeof audience)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="active_30d">Active in the last 30 days</SelectItem>
                <SelectItem value="admins">Admins only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Body (plain text + HTML allowed)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hey! Just wanted to let you know…"
              rows={6}
              className="resize-none font-mono text-[12px]"
              maxLength={5000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (
                confirm(
                  `Send this broadcast to the ${audience} audience? This cannot be undone.`
                )
              ) {
                send.mutate()
              }
            }}
            disabled={!subject.trim() || !body.trim() || send.isPending}
            className="bg-brand-accent text-brand-on-accent hover:bg-brand-accent-hover"
          >
            {send.isPending ? (
              <>
                <Spinner className="mr-1.5 size-3.5" />
                Sending…
              </>
            ) : (
              <>
                <Send className="mr-1.5 size-3.5" />
                Send now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Email log ─────────────────────────────────────────────────────────────

type EmailLogRow = {
  id: string
  to: string
  subject: string
  kind: string
  success: boolean
  error: string | null
  sentAt: string
}

function EmailLogSection() {
  const log = useQuery({
    queryKey: ["admin-email-log"],
    queryFn: async () => {
      const r = await fetch("/api/admin/email-log?limit=100")
      if (!r.ok) throw new Error("Failed")
      return r.json() as Promise<{ entries: EmailLogRow[] }>
    },
    refetchInterval: 30 * 1000,
  })

  return (
    <Card className="border-brand-rule bg-brand-card overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
          <Inbox className="size-4 text-brand-accent" />
          Transactional email log
        </CardTitle>
        <CardDescription className="text-[12px] text-brand-muted-soft">
          The last 100 emails we sent (OTP, broadcasts, password resets).
          Useful for "did the user get the email?" debugging.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {log.isLoading ? (
          <div className="flex justify-center py-8 text-brand-muted-soft">
            <Spinner className="size-4" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-cream-soft/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  When
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  To
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Kind
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Subject
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Result
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(log.data?.entries ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-[10px] text-brand-muted-soft">
                    {formatDistanceToNow(new Date(e.sentAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{e.to}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] uppercase tracking-[0.04em]"
                    >
                      {e.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px]">{e.subject}</TableCell>
                  <TableCell>
                    {e.success ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 font-mono text-[9px] uppercase tracking-[0.04em] text-emerald-900"
                      >
                        sent
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-red-300 bg-red-50 font-mono text-[9px] uppercase tracking-[0.04em] text-red-900"
                        title={e.error ?? ""}
                      >
                        failed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
