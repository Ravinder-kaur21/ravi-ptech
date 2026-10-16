"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Star, ArrowRight, MoreHorizontal, Copy, ExternalLink } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

type Load = {
  id: string
  loadNumber: string
  originCity: string | null
  originState: string | null
  destCity: string | null
  destState: string | null
  status: string
  isStarred: boolean | null
  updatedAt: Date | string | null
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-brand-muted-soft",
  booked: "bg-brand-accent",
  dispatched: "bg-brand-accent",
  in_transit: "bg-brand-ink",
  delivered: "bg-brand-success",
  completed: "bg-brand-success",
  cancelled: "bg-brand-muted-soft/50",
}

function statusColor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.available
}

export function PinnedRecent({ orgId }: { orgId: string }) {
  // [PINNED-RECENT] Fetch recent loads for this org. The org is resolved
  // server-side from the session, so nothing tenant-related is sent here.
  const { data: loads = [], isLoading } = useQuery<Load[]>({
    queryKey: ["sidebar-recent-loads", orgId],
    queryFn: async () => {
      const res = await fetch("/api/sidebar/recent-loads")
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!orgId,
    staleTime: 30_000,
  })

  const pinned = loads.filter((l) => l.isStarred).slice(0, 3)
  const recent = loads.slice(0, 5)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
        Pinned &amp; Recent
      </SidebarGroupLabel>
      <SidebarGroupAction
        render={<Link href="/loads" aria-label="View all loads" />}
        title="View all loads"
      >
        <ArrowRight className="size-3.5" />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <SidebarMenuItem key={`sk-${i}`}>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Skeleton className="size-3.5 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2.5 w-28" />
                    </div>
                  </div>
                </SidebarMenuItem>
              ))}
            </>
          )}

          {/* PINNED */}
          {!isLoading && pinned.length > 0 && (
            <>
              {pinned.map((l) => (
                <LoadRow key={`p-${l.id}`} load={l} pinned />
              ))}
            </>
          )}
          {!isLoading && pinned.length === 0 && (
            <SidebarMenuItem>
              <div className="px-2 py-1.5 text-[12px] italic text-brand-muted-soft flex items-center gap-1.5">
                <Star className="size-3 opacity-40" />
                <span>No pinned loads</span>
              </div>
            </SidebarMenuItem>
          )}

          {/* RECENT */}
          {!isLoading && recent.length > 0 && (
            <>
              <SidebarMenuItem>
                <div className="mx-2 my-1 h-px bg-sidebar-border" />
              </SidebarMenuItem>
              {recent.map((l) => (
                <LoadRow key={`r-${l.id}`} load={l} />
              ))}
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function LoadRow({ load, pinned = false }: { load: Load; pinned?: boolean }) {
  const route =
    load.originCity && load.destCity
      ? `${load.originCity} → ${load.destCity}`
      : load.loadNumber
  const ago = load.updatedAt
    ? formatDistanceToNow(new Date(load.updatedAt), { addSuffix: false })
    : null
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={`/loads/${load.id}`} />}
        tooltip={`${load.loadNumber} · ${route}`}
        className="text-brand-ink/80 hover:bg-brand-accent-tint hover:text-brand-ink h-auto py-1.5"
      >
        {pinned ? (
          <Star className="size-3.5 text-brand-accent fill-brand-accent shrink-0" />
        ) : (
          <span className={`size-1.5 rounded-full shrink-0 ${statusColor(load.status)}`} />
        )}
        <div className="grid flex-1 text-left text-[12px] leading-tight min-w-0">
          <span className="truncate font-medium">{load.loadNumber}</span>
          <span className="truncate text-[10px] text-brand-muted-soft font-mono">
            {route}
            {ago && ` · ${ago}`}
          </span>
        </div>
      </SidebarMenuButton>
      {pinned && <LoadRowActions loadId={load.id} loadNumber={load.loadNumber} />}
    </SidebarMenuItem>
  )
}

/**
 * Kebab `SidebarMenuAction showOnHover` — sidebar-07 parity.
 * Unpins, copies the load id, opens in a new tab.
 */
function LoadRowActions({ loadId, loadNumber }: { loadId: string; loadNumber: string }) {
  const router = useRouter()
  const qc = useQueryClient()

  const unpin = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/loads/${loadId}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: false }),
      })
      if (!r.ok) throw new Error("Failed to unpin")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sidebar-recent-loads"] })
      toast.success(`Unpinned ${loadNumber}`)
    },
    onError: () => toast.error("Couldn't unpin load"),
  })

  const handleCopyId = () => {
    void navigator.clipboard.writeText(loadId)
    toast.success("Load id copied")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuAction
            showOnHover
            aria-label={`More actions for ${loadNumber}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={4}
        className="min-w-44 rounded-lg border-brand-rule bg-brand-card p-1"
      >
        <DropdownMenuItem
          render={
            <Link href={`/loads/${loadId}`} className="rounded-md cursor-pointer" />
          }
        >
          <ExternalLink className="mr-2 size-4 text-brand-muted-soft" />
          Open load
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <Link
              href={`/loads/${loadId}`}
              className="rounded-md cursor-pointer"
              target="_blank"
            />
          }
        >
          <ExternalLink className="mr-2 size-4 text-brand-muted-soft" />
          Open in new tab
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleCopyId}
          className="rounded-md cursor-pointer"
        >
          <Copy className="mr-2 size-4 text-brand-muted-soft" />
          Copy load id
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => unpin.mutate()}
          disabled={unpin.isPending}
          className="rounded-md cursor-pointer text-brand-accent focus:text-brand-accent"
        >
          <Star className="mr-2 size-4" />
          Unpin from sidebar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
