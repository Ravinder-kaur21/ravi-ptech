"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, ShieldOff } from "lucide-react"

export type MemberTarget = { id: string; name: string; email: string } | null

/**
 * SuspendMemberDialog — Phase 1 (WS-26). Confirms a workspace-scoped
 * suspension with optional reason + optional until date. Does NOT
 * touch platform-level user.suspendedAt.
 */
export function SuspendMemberDialog({
  target,
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  target: MemberTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    memberId: string,
    reason: string | undefined,
    until: string | undefined,
  ) => void
  pending: boolean
}) {
  const [reason, setReason] = useState("")
  const [until, setUntil] = useState("")
  // Reset state whenever the dialog re-opens with a new target.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setReason("")
      setUntil("")
    }
  }, [open, target?.id])
  /* eslint-enable react-hooks/set-state-in-effect */
  if (!target) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {target.name || target.email}?</DialogTitle>
          <DialogDescription>
            Suspends them from <b>this workspace only</b>. They keep their
            account and other workspace memberships. Their active sessions
            in this workspace will be revoked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this member being suspended?"
              className="min-h-[64px]"
              maxLength={500}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suspend-until">Suspend until (optional)</Label>
            <Input
              id="suspend-until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="h-10"
            />
            <p className="text-[11px] text-brand-muted-soft">
              Leave blank for indefinite suspension.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              let iso: string | undefined = undefined
              if (until) {
                const d = new Date(until)
                if (Number.isNaN(d.getTime())) {
                  toast.error("Invalid date")
                  return
                }
                iso = d.toISOString()
              }
              onSubmit(target.id, reason.trim() || undefined, iso)
            }}
            disabled={pending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldOff className="h-4 w-4 mr-2" />
            )}
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * TransferOwnershipDialog — Phase 1 (WS-28). Type-to-confirm dialog
 * for ownership transfer. Single-transaction demote-self + promote-target
 * guarantees the workspace never has zero owners.
 */
export function TransferOwnershipDialog({
  target,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  target: MemberTarget
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (newOwnerMemberId: string) => void
  pending: boolean
}) {
  const [typed, setTyped] = useState("")
  // Reset typed state when re-opened with new target
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setTyped("")
    }
  }, [open, target?.id])
  /* eslint-enable react-hooks/set-state-in-effect */
  if (!target) return null
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTyped("")
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Transfer ownership to {target.name || target.email}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You will be demoted to <b>admin</b>. They will become the new
            <b> owner</b> of this workspace. There is no undo — they can
            transfer it back manually.
            <br />
            <br />
            Type <code className="font-mono">TRANSFER</code> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="TRANSFER"
          className="h-10 font-mono"
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(target.id)}
            disabled={typed !== "TRANSFER" || pending}
            className="bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
