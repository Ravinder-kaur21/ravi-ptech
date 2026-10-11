"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import {
  Building2,
  Trash2,
  ExternalLink,
  Search,
  Users,
} from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type AdminOrg = {
  id: string
  name: string
  slug: string
  logo?: string | null
  createdAt: Date | string
  memberCount: number
}

export function WorkspacesTable() {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [confirmDelete, setConfirmDelete] = React.useState<AdminOrg | null>(null)
  const [deleteTyped, setDeleteTyped] = React.useState("")
  const [detail, setDetail] = React.useState<AdminOrg | null>(null)

  // [ADMIN-WORKSPACES] Use Better Auth's organization.list (admin can call
  // any client endpoint since they have an active session).
  const orgsQuery = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: async () => {
      console.log("[ADMIN-WORKSPACES] organization.list")
      const { data, error } = await authClient.organization.list()
      if (error) throw new Error(error.message || "Failed to load orgs")
      const list = (data ?? []) as Array<{
        id: string
        name: string
        slug: string
        logo?: string | null
        createdAt: Date | string
      }>
      // Fetch member counts via getFullOrganization for each — heavy but
      // admin-only and bounded. Could be a custom endpoint later.
      const withCounts: AdminOrg[] = await Promise.all(
        list.map(async (o) => {
          const { data: full } = await authClient.organization.getFullOrganization({
            query: { organizationId: o.id },
          })
          return {
            ...o,
            memberCount: (full as any)?.members?.length ?? 0,
          }
        })
      )
      console.log("[ADMIN-WORKSPACES] orgs loaded:", withCounts.length)
      return withCounts
    },
    staleTime: 30 * 1000,
  })

  const orgs = (orgsQuery.data ?? []).filter((o) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    )
  })

  const deleteMutation = useMutation({
    mutationFn: async (org: AdminOrg) => {
      console.log("[ADMIN-WORKSPACES] delete org →", org.id, org.slug)
      const { error } = await authClient.organization.delete({
        organizationId: org.id,
      })
      if (error) throw new Error(error.message || "Failed to delete workspace")
      return org.id
    },
    onSuccess: async (orgId) => {
      console.log("[ADMIN-WORKSPACES] ✅ deleted", orgId)
      // Audit log the delete (fire-and-forget — the workspace is already gone)
      try {
        await fetch(`/api/admin/users/${orgId}/audit-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "org.delete" }),
        })
      } catch (err) {
        console.warn("[ADMIN-WORKSPACES] audit-event write failed (non-fatal):", err)
      }
      toast.success(`Workspace deleted`)
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      setConfirmDelete(null)
      setDeleteTyped("")
      if (detail?.id === orgId) setDetail(null)
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
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
            <Input
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          {orgsQuery.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
              <Spinner className="size-3" />
              Refreshing…
            </div>
          )}
          <div className="ml-auto text-xs text-brand-muted-soft">
            {(orgsQuery.data?.length ?? 0).toLocaleString()}{" "}
            {(orgsQuery.data?.length ?? 0) === 1 ? "workspace" : "workspaces"}
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
            No workspaces match your search.
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
                  Created
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <button
                      onClick={() => setDetail(o)}
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
                    </button>
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
                  <TableCell className="text-xs text-brand-muted-soft">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
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

      {/* ─── Detail sheet ─── */}
      <Sheet open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md border-brand-rule bg-brand-card">
          <SheetHeader>
            <SheetTitle>{detail?.name}</SheetTitle>
            <SheetDescription>
              Workspace · /{detail?.slug} · created{" "}
              {detail && new Date(detail.createdAt).toLocaleDateString()}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Card className="border-brand-rule bg-brand-cream p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-[0.04em] text-brand-muted-soft">
                  Members
                </span>
                <span className="font-serif text-xl text-brand-ink">
                  {detail?.memberCount.toLocaleString()}
                </span>
              </div>
            </Card>
            <div className="space-y-2">
              <Link
                href={`/loads?org=${detail?.id}`}
                className="flex items-center gap-2 rounded-lg p-2.5 -mx-2.5 hover:bg-brand-cream-soft transition-colors group"
              >
                <ExternalLink className="size-3.5 text-brand-muted-soft" />
                <span className="text-sm">View loads (as this workspace)</span>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}