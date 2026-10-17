"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, DollarSign } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { confirmRemittanceAction } from "@/app/actions/tms-carrier"

const PAYMENT_METHODS = [
  "ACH",
  "Wire",
  "Check",
  "QuickPay",
  "EFS",
  "CreditCard",
  "Other",
] as const

interface CarrierPaymentItem {
  id: string
  carrierName?: string | null
  amount: string
  netAmount?: string | null
  currency?: string | null
  invoiceNumber?: string | null
}

export function ConfirmCarrierPaymentDialog({
  payment,
  trigger,
}: {
  payment: CarrierPaymentItem
  trigger?: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const [paymentMethod, setPaymentMethod] = React.useState<typeof PAYMENT_METHODS[number]>("ACH")
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = React.useState("")

  const amountDisplay = payment.netAmount || payment.amount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!referenceNumber.trim()) {
      toast.error("Reference # or Check / Trace # is required")
      return
    }

    startTransition(async () => {
      const res = await confirmRemittanceAction({
        paymentId: payment.id,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        paymentDate,
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        toast.success(`Carrier remittance of $${amountDisplay} confirmed`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to confirm remittance")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 dark:text-emerald-400 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pay Carrier
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Confirm Carrier Remittance</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record remittance details and transition settlement to Paid status.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Payment Summary Box */}
        <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5 my-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Carrier:</span>
            <span className="font-semibold text-foreground">{payment.carrierName || "Contracted Carrier"}</span>
          </div>
          {payment.invoiceNumber && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Carrier Invoice #:</span>
              <span className="font-mono text-foreground">{payment.invoiceNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-xs pt-1 border-t">
            <span className="text-muted-foreground font-medium">Net Remittance Amount:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
              {payment.currency || "USD"} ${amountDisplay}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="remittance-method" className="text-xs font-medium">
              Payment Method
            </Label>
            <NativeSelect
              id="remittance-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="h-9 text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <NativeSelectOption key={m} value={m}>
                  {m}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remittance-ref" className="text-xs font-medium">
              Reference / Trace / Check # <span className="text-destructive">*</span>
            </Label>
            <Input
              id="remittance-ref"
              placeholder="e.g. ACH-992014 or Check #4491"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remittance-date" className="text-xs font-medium">
              Payment Execution Date
            </Label>
            <Input
              id="remittance-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remittance-notes" className="text-xs font-medium">
              Remittance Memo
            </Label>
            <Input
              id="remittance-notes"
              placeholder="e.g. Cleared via Silicon Valley Bank ACH batch"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Spinner className="h-4 w-4 mr-2" />}
              Confirm Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
