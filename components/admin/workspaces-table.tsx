"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Building2,
  Trash2,
  Search,
  Users,
  ExternalLink,
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
import { cn } from "@/lib/utils"

type AdminOrg = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
  suspended: boolean
  suspendedAt: string | null
  suspendedReason: string | null
  memberCount: number
  ownerCount: number
}

const STATUSES = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const
type StatusFilter = (typeof STATUSES)[number]["value"]

export function WorkspacesTable() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [confirmDelete, setConfirmDelete] = React.useState<AdminOrg | null>(null)
  const [deleteTyped, setDeleteTyped] = React.useState("")

  // [ADMIN-WORKSPACES] Server-side filtered list via our /api/admin/workspaces
  // endpoint — replaces the old authClient.organization.list + N+1 pattern.
  const orgsQuery = useQuery({
    queryKey: ["admin-orgs", search, statusFilter],
    queryFn: async () => {
      console.log("[ADMIN-WORKSPACES] fetch", { search, statusFilter })
      const params = new URLSearchParams({
        status: statusFilter,
        limit: "100",
        offset: "0",
      })
      if (search.trim()) params.set("search", search.trim())
      const r = await fetch(`/api/admin/workspaces?${params}`)
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed to load workspaces")
      }
      return r.json() as Promise<{ orgs: AdminOrg[]; total: number }>
    },
    staleTime: 15 * 1000,
  })

  const orgs = orgsQuery.data?.orgs ?? []
  const total = orgsQuery.data?.total ?? 0

  const deleteMutation = useMutation({
    mutationFn: async (org: AdminOrg) => {
      console.log("[ADMIN-WORKSPACES] delete org →", org.id, org.slug)
      const r = await fetch(`/api/admin/workspaces/${org.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: org.name }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed to delete workspace")
      }
      return org.id
    },
    onSuccess: async (orgId) => {
      console.log("[ADMIN-WORKSPACES] ✅ deleted", orgId)
      toast.success("Workspace deleted")
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      setConfirmDelete(null)
      setDeleteTyped("")
      router.refresh()
    },
    onError: (err: Error) => {
      console.error("[ADMIN-WORKSPACES] delete failed:", err)
      toast.error(err.message)
    },
  })

  return (
    <>
      {/* ─── Toolbar ─── */}
      <Card className="border-brand-rule bg-brand-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
            <Input
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => v && setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {orgsQuery.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
              <Spinner className="size-3" />
              Refreshing…
            </div>
          )}
          <div className="ml-auto text-xs text-brand-muted-soft">
            {total.toLocaleString()}{" "}
            {total === 1 ? "workspace" : "workspaces"}
          </div>
        </div>
      </Card>

      {/* ─── Table ─── */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        {orgsQuery.isLoading ? (
          <div className="p-12 flex justify-center text-brand-muted-soft">
            <Spinner className="size-5" />
          </div>
        ) : orgsQuery.isError ? (
          <div className="p-12 text-center text-brand-accent">
            <p className="text-sm">{(orgsQuery.error as Error).message}</p>
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-12 text-center text-sm text-brand-muted-soft">
            {search
              ? "No workspaces match your search."
              : "No workspaces yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-brand-cream-soft/50 hover:bg-brand-cream-soft/50">
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Workspace
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Slug
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Members
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Status
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
                  Created
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/admin/workspaces/${o.id}`}
                      className="flex items-center gap-3 text-left hover:no-underline"
                    >
                      <div className="flex size-9 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent shrink-0">
                        {o.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={o.logo}
                            alt={o.name}
                            className="size-9 rounded-md object-cover"
                          />
                        ) : (
                          <Building2 className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-ink truncate hover:underline">
                          {o.name}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase tracking-[0.04em]"
                    >
                      /{o.slug}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-brand-ink/80">
                      <Users className="size-3.5 text-brand-muted-soft" />
                      {o.memberCount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {o.suspended ? (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase tracking-[0.04em] border-amber-300 bg-amber-50 text-amber-900"
                      >
                        suspended
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase tracking-[0.04em] border-emerald-300 bg-emerald-50 text-emerald-900"
                      >
                        active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-brand-muted-soft">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        render={<Link href={`/admin/workspaces/${o.id}`} />}
                        className="size-8 text-brand-muted-soft hover:text-brand-ink"
                        aria-label="View workspace details"
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setConfirmDelete(o)
                          setDeleteTyped("")
                        }}
                        className="size-8 text-brand-muted-soft hover:text-brand-accent"
                        aria-label="Delete workspace"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ─── Delete confirm ─── */}
      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDelete(null)
            setDeleteTyped("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the workspace, every load, driver,
              invoice, trip, and member record. There is no undo. Type the
              workspace name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Input
              value={deleteTyped}
              onChange={(e) => setDeleteTyped(e.target.value)}
              placeholder={confirmDelete?.name ?? ""}
              className="h-10 font-mono text-sm"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
              disabled={
                deleteTyped !== confirmDelete?.name || deleteMutation.isPending
              }
              className="bg-brand-accent text-white hover:bg-brand-accent/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Deleting…
                </>
              ) : (
                "Delete forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
