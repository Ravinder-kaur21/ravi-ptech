"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

export function QuickCreateLoad({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [loadNumber, setLoadNumber] = React.useState("")
  const [customer, setCustomer] = React.useState("")
  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")

  React.useEffect(() => {
    if (!open) {
      setLoadNumber("")
      setCustomer("")
      setOrigin("")
      setDestination("")
    }
  }, [open])

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadNumber,
          customerName: customer,
          originCity: origin,
          destCity: destination,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create load")
      }
      return r.json()
    },
    onSuccess: (data) => {
      console.log("[QUICK-CREATE] load created:", data)
      toast.success(`Load ${loadNumber} created`)
      onOpenChange(false)
      router.push(`/loads/${data.id}`)
      router.refresh()
    },
    onError: (err: Error) => {
      console.error("[QUICK-CREATE] error:", err)
      toast.error(err.message)
    },
  })

  const canSubmit =
    loadNumber.trim().length > 0 &&
    origin.trim().length > 0 &&
    destination.trim().length > 0 &&
    !create.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-brand-rule bg-brand-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-brand-ink">
            New <span className="italic text-brand-accent">load</span>
          </DialogTitle>
          <DialogDescription className="text-brand-muted-soft">
            Quick-create a draft load. You can fill in the rest on the detail page.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) create.mutate()
          }}
          className="space-y-4"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="qc-loadNumber">Load number</FieldLabel>
              <Input
                id="qc-loadNumber"
                value={loadNumber}
                onChange={(e) => setLoadNumber(e.target.value)}
                placeholder="L-1234"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="qc-customer">Customer</FieldLabel>
              <Input
                id="qc-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Acme Logistics"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="qc-origin">Origin</FieldLabel>
                <Input
                  id="qc-origin"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Dallas, TX"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="qc-dest">Destination</FieldLabel>
                <Input
                  id="qc-dest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Houston, TX"
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-brand-muted-soft hover:text-brand-ink"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-9 max-w-40 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
            >
              {create.isPending ? <Spinner /> : "Create draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
