"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Shield, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CreateRoleDialog({
  trigger,
  defaultCloneFrom,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  trigger?: React.ReactElement
  defaultCloneFrom?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = typeof controlledOpen === "boolean"
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

  const [label, setLabel] = React.useState("")
  const [roleSlug, setRoleSlug] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [cloneFrom, setCloneFrom] = React.useState<string>(defaultCloneFrom ?? "dispatcher")
  const [isSlugManual, setIsSlugManual] = React.useState(false)

  // Auto-generate slug from label until user edits it manually
  const handleLabelChange = (val: string) => {
    setLabel(val)
    if (!isSlugManual) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30)
      setRoleSlug(generated)
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanSlug = roleSlug.trim().toLowerCase()
      if (!cleanSlug) throw new Error("Role identifier is required")
      if (!/^[a-z0-9_]+$/.test(cleanSlug)) {
        throw new Error("Role identifier must be lowercase letters, numbers, and underscores only")
      }

      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          role: cleanSlug,
          description: description.trim() || undefined,
          cloneFrom: cloneFrom === "none" ? undefined : cloneFrom,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to create custom role")
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Custom role "${label}" created successfully`)
      queryClient.invalidateQueries({ queryKey: ["roles-list"] })
      setOpen(false)
      // Reset form
      setLabel("")
      setRoleSlug("")
      setDescription("")
      setIsSlugManual(false)
      // Navigate to the newly created role detail/edit page
      router.push(`/settings/roles/${data.role.role}`)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger
          onClick={() => setOpen(true)}
          render={trigger}
        />
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
              <Sparkles className="size-3.5" />
            </div>
            <DialogTitle className="font-serif text-xl">Create Custom Role</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-brand-muted-soft">
            Define a workspace role with tailored baseline permissions across all 130 TMS actions.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-4 py-2"
        >
          {/* Role Label */}
          <div className="space-y-1.5">
            <Label htmlFor="role-label" className="text-xs font-medium">
              Role Name
            </Label>
            <Input
              id="role-label"
              placeholder="e.g. Night Dispatcher, Lead Fleet Mechanic"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="h-9 text-xs"
              autoFocus
              required
            />
          </div>

          {/* Role Slug Identifier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="role-slug" className="text-xs font-medium">
                System Identifier (Slug)
              </Label>
              <span className="text-[10px] font-mono text-brand-muted-soft">
                lowercase letters and underscores
              </span>
            </div>
            <Input
              id="role-slug"
              placeholder="e.g. night_dispatcher"
              value={roleSlug}
              onChange={(e) => {
                setIsSlugManual(true)
                setRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }}
              className="h-9 text-xs font-mono"
              required
            />
          </div>

          {/* Clone from preset */}
          <div className="space-y-1.5">
            <Label htmlFor="clone-from" className="text-xs font-medium">
              Clone Default Permissions From
            </Label>
            <Select value={cloneFrom} onValueChange={setCloneFrom}>
              <SelectTrigger id="clone-from" className="h-9 text-xs">
                <SelectValue placeholder="Select preset to clone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dispatcher" className="text-xs">
                  Dispatcher (Loads, trips, dispatch, assign drivers)
                </SelectItem>
                <SelectItem value="safety" className="text-xs">
                  Safety Officer (HOS compliance, DVIRs, maintenance)
                </SelectItem>
                <SelectItem value="accounting" className="text-xs">
                  Accounting / Billing (Invoices, rates, payments)
                </SelectItem>
                <SelectItem value="driver" className="text-xs">
                  Driver (Assigned loads, mobile status updates)
                </SelectItem>
                <SelectItem value="admin" className="text-xs">
                  Administrator (Operations, team, broad access)
                </SelectItem>
                <SelectItem value="none" className="text-xs">
                  Start Empty (0 permissions enabled)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-brand-muted-soft">
              You can toggle any of the 130 keys after the role is created.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="role-desc" className="text-xs font-medium">
              Description (Optional)
            </Label>
            <Input
              id="role-desc"
              placeholder="Brief summary of duties for this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !label.trim() || !roleSlug.trim()}
              className="h-8 gap-1.5 text-xs bg-brand-ink text-brand-cream hover:bg-brand-ink-soft"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Creating role...
                </>
              ) : (
                <>
                  <Plus className="size-3" />
                  Create Role
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
