"use client"

import * as React from "react"
import { CheckCircle2, DollarSign, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { applyPaymentAction } from "@/app/actions/tms-billing"

interface ApplyPaymentDialogProps {
  invoiceId: string
  invoiceNumber: string
  totalAmount: string
  customerName?: string | null
}

export function ApplyPaymentDialog({
  invoiceId,
  invoiceNumber,
  totalAmount,
  customerName,
}: ApplyPaymentDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [paidAmount, setPaidAmount] = React.useState(totalAmount)
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = React.useState("ACH / Electronic")
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paidAmount || parseFloat(paidAmount) <= 0) {
      toast.error("Valid payment amount required")
      return
    }

    setLoading(true)
    try {
      const res = await applyPaymentAction({
        invoiceId,
        paidAmount,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      })

      if (res.ok) {
        toast.success(`Payment applied to invoice ${res.invoiceNumber}`)
        setOpen(false)
      } else {
        toast.error(res.error || "Failed to record payment")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to apply payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-[11px] gap-1 border-brand-rule text-brand-ink hover:border-brand-accent/50 hover:bg-brand-cream-soft"
          />
        }
      >
        <DollarSign className="size-3 text-emerald-600" />
        Apply Payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-brand-card border-brand-rule">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-brand-ink">
                Record Payment for {invoiceNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-brand-muted-soft">
              Record a customer remittance to reconcile accounts receivable for {customerName || "this customer"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pAmount" className="text-xs font-medium text-brand-ink">
                  Amount Received ($) *
                </Label>
                <Input
                  id="pAmount"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="2400.00"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pDate" className="text-xs font-medium text-brand-ink">
                  Date Received
                </Label>
                <Input
                  id="pDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pMethod" className="text-xs font-medium text-brand-ink">
                  Payment Method
                </Label>
                <NativeSelect
                  id="pMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-xs"
                >
                  <NativeSelectOption value="ACH / Electronic">ACH / Electronic</NativeSelectOption>
                  <NativeSelectOption value="Paper Check">Paper Check</NativeSelectOption>
                  <NativeSelectOption value="Wire Transfer">Wire Transfer</NativeSelectOption>
                  <NativeSelectOption value="Credit Card">Credit Card</NativeSelectOption>
                  <NativeSelectOption value="Factoring Advance">Factoring Advance</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refNum" className="text-xs font-medium text-brand-ink">
                  Check / Ref #
                </Label>
                <Input
                  id="refNum"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="CHK-4089"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pNotes" className="text-xs font-medium text-brand-ink">
                Reconciliation Notes (Optional)
              </Label>
              <Input
                id="pNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Full settlement of load invoice"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-8 text-xs border-brand-rule"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
