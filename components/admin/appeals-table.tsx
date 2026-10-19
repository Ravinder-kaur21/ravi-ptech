"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  Check,
  X,
  Pause,
  Clock,
  MessageSquare,
  ChevronRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { useWorkspaceDate } from "@/lib/timezone"

type AppealRow = {
  id: string
  name: string | null
  email: string
  suspendedAt: Date | string | null
  suspendedUntil: Date | string | null
  suspendedReason: string | null
  appealMessage: string | null
  appealSubmittedAt: Date | string | null
  appealStatus: string | null
}

export function AppealsTable({
  initialAppeals,
}: {
  initialAppeals: AppealRow[]
}) {
  const { formatDate } = useWorkspaceDate()
  const queryClient = useQueryClient()
  const [active, setActive] = React.useState<AppealRow | null>(null)
  const [decision, setDecision] = React.useState<"approved" | "denied" | null>(
    null
  )
  const [filter, setFilter] = React.useState<"open" | "all">("open")

  // [ADMIN-APPEALS] Periodic refetch so new appeals show up without reload.
  const appealsQuery = useQuery({
    queryKey: ["admin-appeals"],
    queryFn: async () => {
      const r = await fetch("/api/admin/appeals")
      if (!r.ok) throw new Error("Failed to load appeals")
      return r.json() as Promise<{ appeals: AppealRow[] }>
    },
    initialData: { appeals: initialAppeals },
    refetchInterval: 30 * 1000,
  })

  const allAppeals = appealsQuery.data?.appeals ?? []
  const visible = allAppeals.filter((a) =>
    filter === "open" ? a.appealStatus === "open" : true
  )

  const resolve = useMutation({
    mutationFn: async (input: {
      userId: string
      decision: "approved" | "denied"
    }) => {
      const r = await fetch(`/api/admin/users/${input.userId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve-appeal", decision: input.decision }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.error || "Failed to resolve appeal")
      }
      return r.json()
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.decision === "approved"
          ? "Approved — suspension lifted"
          : "Denied"
      )
      queryClient.invalidateQueries({ queryKey: ["admin-appeals"] })
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setDecision(null)
      setActive(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      {/* ─── Toolbar ─── */}
      <Card className="border-brand-rule bg-brand-card p-4">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-brand-rule p-0.5 bg-brand-cream-soft">
            <button
              onClick={() => setFilter("open")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === "open"
                  ? "bg-brand-card text-brand-ink shadow-sm"
                  : "text-brand-muted-soft hover:text-brand-ink"
              )}
            >
              Open only
            </button>
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filter === "all"
                  ? "bg-brand-card text-brand-ink shadow-sm"
                  : "text-brand-muted-soft hover:text-brand-ink"
              )}
            >
              All time
            </button>
          </div>
          {appealsQuery.isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-brand-muted-soft">
              <Spinner className="size-3" />
              Refreshing…
            </div>
          )}
          <div className="ml-auto text-xs text-brand-muted-soft">
            {visible.length} {visible.length === 1 ? "appeal" : "appeals"}
          </div>
        </div>
      </Card>

      {/* ─── List ─── */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        {appealsQuery.isLoading ? (
          <div className="p-12 flex justify-center text-brand-muted-soft">
            <Spinner className="size-5" />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-brand-muted-soft">
            No appeals {filter === "open" ? "are awaiting review" : "yet"}.
          </div>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {visible.map((a) => {
              const initials =
                (a.name || a.email)
                  .split(/[\s@]/g)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "?"
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-4 p-4 hover:bg-brand-cream-soft/50 cursor-pointer"
                  onClick={() => setActive(a)}
                >
                  <Avatar className="size-10 rounded-full">
                    <AvatarImage
                      src={undefined}
                      alt={a.name ?? a.email}
                    />
                    <AvatarFallback className="bg-brand-accent text-brand-cream text-xs font-semibold rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-brand-ink">
                        {a.email}
                      </p>
                      {a.appealStatus === "open" && (
                        <Badge
                          variant="outline"
                          className="border-blue-300 bg-blue-50 text-blue-900 font-mono text-[9px] uppercase tracking-[0.04em]"
                        >
                          <Clock className="size-2.5 mr-1" />
                          Open
                        </Badge>
                      )}
                      {a.appealStatus === "approved" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 text-emerald-900 font-mono text-[9px] uppercase tracking-[0.04em]"
                        >
                          <Check className="size-2.5 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {a.appealStatus === "denied" && (
                        <Badge
                          variant="outline"
                          className="border-red-300 bg-red-50 text-red-900 font-mono text-[9px] uppercase tracking-[0.04em]"
                        >
                          <X className="size-2.5 mr-1" />
                          Denied
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-brand-muted-soft">
                      {a.appealMessage ?? "(no message)"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-brand-muted-soft">
                      {a.appealSubmittedAt
                        ? `${formatDistanceToNow(new Date(a.appealSubmittedAt))} ago`
                        : ""}
                    </p>
                    <ChevronRight className="size-4 text-brand-muted-soft mt-1 ml-auto" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ─── Detail sheet ─── */}
      <Sheet
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
      >
        <SheetContent className="sm:max-w-lg border-brand-rule bg-brand-card overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{active?.email}</SheetTitle>
            <SheetDescription>
              Suspension reason + user appeal
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-900 mb-2">
                <Pause className="size-4" />
                <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em]">
                  Original reason
                </h3>
              </div>
              <p className="text-sm text-amber-950">
                {active?.suspendedReason ?? "(none recorded)"}
              </p>
              {active?.suspendedUntil && (
                <p className="mt-2 text-[11px] text-amber-900/70">
                  Auto-lifts on{" "}
                  {formatDate(new Date(active.suspendedUntil))}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-brand-rule bg-brand-cream p-4">
              <div className="flex items-center gap-2 text-brand-ink mb-2">
                <MessageSquare className="size-4" />
                <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em]">
                  Their appeal
                </h3>
              </div>
              <p className="text-sm whitespace-pre-wrap text-brand-ink">
                {active?.appealMessage ?? "(no message submitted)"}
              </p>
              {active?.appealSubmittedAt && (
                <p className="mt-2 text-[11px] text-brand-muted-soft">
                  Submitted{" "}
                  {formatDistanceToNow(new Date(active.appealSubmittedAt))} ago
                </p>
              )}
            </div>

            {active?.appealStatus === "open" && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setDecision("denied")}
                  variant="outline"
                  className="h-10 flex-1 border-red-200 text-red-900 hover:bg-red-50"
                >
                  <X className="mr-2 size-4" />
                  Deny
                </Button>
                <Button
                  onClick={() => setDecision("approved")}
                  className="h-10 flex-1 bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  <Check className="mr-2 size-4" />
                  Approve & lift
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Confirm dialog ─── */}
      <AlertDialog
        open={decision !== null && active !== null}
        onOpenChange={(o) => !o && setDecision(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approved"
                ? `Approve appeal for ${active?.email}?`
                : `Deny appeal for ${active?.email}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision === "approved"
                ? "This lifts the suspension immediately. The user can sign in right after you confirm."
                : "This keeps the suspension active. The user may submit another appeal with new context."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                active &&
                decision &&
                resolve.mutate({ userId: active.id, decision })
              }
              disabled={resolve.isPending}
              className={
                decision === "approved"
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "bg-red-700 text-white hover:bg-red-800"
              }
            >
              {resolve.isPending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Saving…
                </>
              ) : decision === "approved" ? (
                "Approve & lift"
              ) : (
                "Deny"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}