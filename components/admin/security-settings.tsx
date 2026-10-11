"use client"

/**
 * SecuritySettings — the /admin/security page.
 *
 * Sections:
 *   1. Maintenance mode (system setting)
 *   2. IP allowlist (admin-source allowlist)
 *   3. Email allowlist (signup gate)
 *   4. Email blocklist (always reject)
 *   5. Brute-force dashboard (recent failed signup attempts, by IP)
 *
 * Each section is a Card with its own Tabs / Table / Form. All write
 * actions are audited via recordAuditEvent.
 */
import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  Shield,
  ShieldOff,
  Plus,
  Trash2,
  Globe,
  Mail,
  MailCheck,
  AlertTriangle,
  Activity,
  Server,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export function SecuritySettings() {
  return (
    <Tabs defaultValue="maintenance" className="w-full">
      <TabsList className="inline-flex h-9 border-brand-rule bg-brand-card">
        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        <TabsTrigger value="ip">IP allowlist</TabsTrigger>
        <TabsTrigger value="email">Email policy</TabsTrigger>
        <TabsTrigger value="brute">Brute-force</TabsTrigger>
      </TabsList>
      <TabsContent value="maintenance" className="mt-4">
        <MaintenanceSection />
      </TabsContent>
      <TabsContent value="ip" className="mt-4">
        <IpAllowlistSection />
      </TabsContent>
      <TabsContent value="email" className="mt-4">
        <EmailPolicySection />
      </TabsContent>
      <TabsContent value="brute" className="mt-4">
        <BruteForceSection />
      </TabsContent>
    </Tabs>
  )
}

// ─── Maintenance mode ───────────────────────────────────────────────────────

function MaintenanceSection() {
  const queryClient = useQueryClient()
  const statusQuery = useQuery({
    queryKey: ["admin-maintenance"],
    queryFn: async () => {
      const r = await fetch("/api/admin/security/maintenance")
      if (!r.ok) throw new Error("Failed to load maintenance status")
      return r.json() as Promise<{
        enabled: boolean
        message: string | null
        startedAt: string | null
        startedByEmail: string | null
        endsAt: string | null
      }>
    },
  })

  const [confirmEnable, setConfirmEnable] = React.useState(false)
  const [confirmDisable, setConfirmDisable] = React.useState(false)
  const [message, setMessage] = React.useState("")

  const toggle = useMutation({
    mutationFn: async (input: { enabled: boolean; message?: string }) => {
      const r = await fetch("/api/admin/security/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled")
      setConfirmEnable(false)
      setConfirmDisable(false)
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["admin-maintenance"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const enabled = statusQuery.data?.enabled ?? false

  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
          <Server className="size-4 text-brand-accent" />
          Maintenance mode
        </CardTitle>
        <CardDescription className="text-[12px] text-brand-muted-soft">
          When on, every non-admin page renders a "be right back" screen.
          Admins always see the full app so you can still manage things.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-brand-rule bg-brand-cream p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-brand-ink">
              {enabled ? "Maintenance is ON" : "Maintenance is OFF"}
            </p>
            {statusQuery.data?.startedAt && (
              <p className="font-mono text-[11px] text-brand-muted-soft">
                started {formatDistanceToNow(new Date(statusQuery.data.startedAt), { addSuffix: true })}
                {statusQuery.data.startedByEmail
                  ? ` by ${statusQuery.data.startedByEmail}`
                  : ""}
              </p>
            )}
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              if (v) setConfirmEnable(true)
              else setConfirmDisable(true)
            }}
            disabled={statusQuery.isLoading || toggle.isPending}
          />
        </div>

        {enabled && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-900">
            <p className="font-medium">Heads up</p>
            <p className="mt-0.5">
              Every signed-in user who is not a superadmin is seeing the
              maintenance page right now. Disable as soon as you're done.
            </p>
          </div>
        )}

        <AlertDialog open={confirmEnable} onOpenChange={setConfirmEnable}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable maintenance mode?</AlertDialogTitle>
              <AlertDialogDescription>
                Non-admin users will see a maintenance page until you turn it
                off. You can add an optional message to display.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5 py-2">
              <Label htmlFor="maint-msg">Message (optional)</Label>
              <Input
                id="maint-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="We'll be back in 30 minutes…"
                className="h-10"
                maxLength={200}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => toggle.mutate({ enabled: true, message })}
                disabled={toggle.isPending}
                className="bg-amber-700 text-white hover:bg-amber-800"
              >
                Enable
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable maintenance mode?</AlertDialogTitle>
              <AlertDialogDescription>
                Non-admin users will see the live app again immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => toggle.mutate({ enabled: false })}
                disabled={toggle.isPending}
                className="bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Disable
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

// ─── IP allowlist ───────────────────────────────────────────────────────────

function IpAllowlistSection() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ["admin-ip-allowlist"],
    queryFn: async () => {
      const r = await fetch("/api/admin/security/ip-allowlist")
      if (!r.ok) throw new Error("Failed")
      return r.json() as Promise<{
        entries: Array<{
          id: string
          cidr: string
          label: string | null
          expiresAt: string | null
          createdBy: string | null
          createdAt: string
        }>
        enabled: boolean
      }>
    },
  })

  const [cidr, setCidr] = React.useState("")
  const [label, setLabel] = React.useState("")

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/security/ip-allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidr: cidr.trim(), label: label.trim() || null }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Added")
      setCidr("")
      setLabel("")
      queryClient.invalidateQueries({ queryKey: ["admin-ip-allowlist"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/security/ip-allowlist/${id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed")
      return r.json()
    },
    onSuccess: () => {
      toast.success("Removed")
      queryClient.invalidateQueries({ queryKey: ["admin-ip-allowlist"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
          <Globe className="size-4 text-brand-accent" />
          IP allowlist (admin source)
        </CardTitle>
        <CardDescription className="text-[12px] text-brand-muted-soft">
          When the list is empty, the /admin console is reachable from any
          IP. Adding a CIDR restricts access to those ranges only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="203.0.113.0/24 or 203.0.113.5"
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            className="h-9 font-mono text-[12px]"
          />
          <Input
            placeholder="Office (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-9"
          />
          <Button
            onClick={() => add.mutate()}
            disabled={!cidr.trim() || add.isPending}
            className="h-9 bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>

        <div className="rounded-lg border border-brand-rule bg-brand-card overflow-hidden">
          {list.isLoading ? (
            <div className="flex justify-center p-8 text-brand-muted-soft">
              <Spinner className="size-4" />
            </div>
          ) : (list.data?.entries.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-brand-muted-soft">
              No entries — admin source is unrestricted.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-cream-soft/50">
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    CIDR
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Label
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Added
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data!.entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-[12px]">{e.cidr}</TableCell>
                    <TableCell className="text-sm">{e.label ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[10px] text-brand-muted-soft">
                      {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(e.id)}
                        className="size-7 text-brand-muted-soft hover:text-brand-accent"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Email policy (allow/block) ─────────────────────────────────────────────

function EmailPolicySection() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EmailList
        kind="allow"
        title="Email allowlist"
        description="If non-empty, only addresses matching one of these patterns can sign up. Supports wildcards like *@yourcompany.com."
        icon={MailCheck}
        emptyHint="No allowlist — anyone can sign up."
        endpoint="/api/admin/security/email-allowlist"
        queryKey={["admin-email-allowlist"]}
      />
      <EmailList
        kind="block"
        title="Email blocklist"
        description="These addresses or domain wildcards are always rejected at signup."
        icon={Mail}
        emptyHint="No blocked addresses."
        endpoint="/api/admin/security/email-blocklist"
        queryKey={["admin-email-blocklist"]}
      />
    </div>
  )
}

function EmailList({
  kind,
  title,
  description,
  icon: Icon,
  emptyHint,
  endpoint,
  queryKey,
}: {
  kind: "allow" | "block"
  title: string
  description: string
  icon: LucideIcon
  emptyHint: string
  endpoint: string
  queryKey: readonly unknown[]
}) {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await fetch(endpoint)
      if (!r.ok) throw new Error("Failed")
      return r.json() as Promise<{
        entries: Array<{
          id: string
          pattern: string
          reason: string | null
          createdAt: string
        }>
      }>
    },
  })

  const [pattern, setPattern] = React.useState("")
  const [reason, setReason] = React.useState("")

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: pattern.trim(), reason: reason.trim() || null }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed")
      }
      return r.json()
    },
    onSuccess: () => {
      toast.success("Added")
      setPattern("")
      setReason("")
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${endpoint}/${id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed")
      return r.json()
    },
    onSuccess: () => {
      toast.success("Removed")
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
          <Icon className="size-4 text-brand-accent" />
          {title}
        </CardTitle>
        <CardDescription className="text-[12px] text-brand-muted-soft">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder={kind === "allow" ? "*@yourcompany.com" : "*@spammer.net"}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="h-9 font-mono text-[12px]"
          />
          <Input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9"
          />
          <Button
            onClick={() => add.mutate()}
            disabled={!pattern.trim() || add.isPending}
            className="h-9 bg-brand-ink text-brand-cream hover:bg-brand-ink-hover"
          >
            <Plus className="mr-1 size-3.5" />
            Add
          </Button>
        </div>

        <div className="rounded-lg border border-brand-rule bg-brand-card overflow-hidden">
          {list.isLoading ? (
            <div className="flex justify-center p-8 text-brand-muted-soft">
              <Spinner className="size-4" />
            </div>
          ) : (list.data?.entries.length ?? 0) === 0 ? (
            <div className="p-6 text-center text-sm text-brand-muted-soft">{emptyHint}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-cream-soft/50">
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Pattern
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Reason
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data!.entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-[12px]">{e.pattern}</TableCell>
                    <TableCell className="text-[12px] text-brand-muted-soft">
                      {e.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(e.id)}
                        className="size-7 text-brand-muted-soft hover:text-brand-accent"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Brute-force dashboard ─────────────────────────────────────────────────

function BruteForceSection() {
  const recent = useQuery({
    queryKey: ["admin-signup-attempts"],
    queryFn: async () => {
      const r = await fetch("/api/admin/security/signup-attempts")
      if (!r.ok) throw new Error("Failed")
      return r.json() as Promise<{
        recent: Array<{
          id: string
          email: string
          ipAddress: string | null
          success: boolean
          reason: string | null
          createdAt: string
        }>
        topOffenders: Array<{ ipAddress: string; count: number }>
        failedLastHour: number
        failedLastDay: number
      }>
    },
    refetchInterval: 30 * 1000,
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Failed signups (1h)"
          value={recent.data?.failedLastHour ?? 0}
          tone={(recent.data?.failedLastHour ?? 0) > 10 ? "warn" : "default"}
        />
        <KpiTile
          label="Failed signups (24h)"
          value={recent.data?.failedLastDay ?? 0}
          tone={(recent.data?.failedLastDay ?? 0) > 50 ? "warn" : "default"}
        />
        <KpiTile
          label="Distinct attacking IPs (24h)"
          value={recent.data?.topOffenders.length ?? 0}
        />
      </div>

      <Card className="border-brand-rule bg-brand-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg tracking-tight text-brand-ink">
            <Activity className="size-4 text-brand-accent" />
            Recent signup attempts
          </CardTitle>
          <CardDescription className="text-[12px] text-brand-muted-soft">
            Every signup attempt — success or failure — is logged with the
            email, IP, and failure reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <div className="flex justify-center p-8 text-brand-muted-soft">
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
                    Email
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    IP
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                    Outcome
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recent.data?.recent ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-[10px] text-brand-muted-soft">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{r.email}</TableCell>
                    <TableCell className="font-mono text-[11px]">{r.ipAddress ?? "—"}</TableCell>
                    <TableCell>
                      {r.success ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 font-mono text-[9px] uppercase tracking-[0.04em] text-emerald-900"
                        >
                          success
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-red-300 bg-red-50 font-mono text-[9px] uppercase tracking-[0.04em] text-red-900"
                        >
                          {r.reason ?? "failed"}
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
    </div>
  )
}

function KpiTile({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "warn"
}) {
  return (
    <Card className="border-brand-rule bg-brand-card">
      <CardContent className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 font-serif text-3xl tracking-tight tabular-nums",
            tone === "warn" ? "text-amber-900" : "text-brand-ink"
          )}
        >
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
