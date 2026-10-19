"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Banknote, Plus, Calculator, FileText, ArrowRight } from "lucide-react"
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
import { getAllCurrencies } from "@/lib/currencies"
import { createCarrierPaymentAction } from "@/app/actions/tms-carrier"

interface CarrierOption {
  id: string
  name: string
  mcNumber?: string | null
  paymentTerms?: string | null
}

interface TripOption {
  id: string
  tripNumber: string
  loadNumber?: string | null
}

export function CreateCarrierPaymentDialog({
  carriers = [],
  trips = [],
}: {
  carriers: CarrierOption[]
  trips: TripOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const allCurrencies = React.useMemo(() => getAllCurrencies(), [])

  const [carrierId, setCarrierId] = React.useState("")
  const [tripId, setTripId] = React.useState("")
  const [invoiceNumber, setInvoiceNumber] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [additions, setAdditions] = React.useState("0")
  const [deductions, setDeductions] = React.useState("0")
  const [currency, setCurrency] = React.useState("USD")
  const [notes, setNotes] = React.useState("")

  const baseVal = Number(amount) || 0
  const addVal = Number(additions) || 0
  const dedVal = Number(deductions) || 0
  const computedNet = Math.max(0, baseVal + addVal - dedVal).toFixed(2)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!carrierId) {
      toast.error("Please select a carrier")
      return
    }
    if (!amount.trim() || Number(amount) <= 0) {
      toast.error("Base agreed pay amount must be greater than zero")
      return
    }

    startTransition(async () => {
      const res = await createCarrierPaymentAction({
        carrierId,
        tripId: tripId || undefined,
        amount: amount.trim(),
        additions: additions.trim() || "0",
        deductions: deductions.trim() || "0",
        currency: currency || "USD",
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        toast.success(`Carrier settlement of ${currency} $${computedNet} logged`)
        setOpen(false)
        setCarrierId("")
        setTripId("")
        setInvoiceNumber("")
        setAmount("")
        setAdditions("0")
        setDeductions("0")
        setNotes("")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to record carrier payment")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="default" className="gap-2">
            <Plus className="h-4 w-4" />
            New Carrier Settlement
          </Button>
        }
      />
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">New Carrier Settlement</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate an outside carrier settlement record with detention, layover, or deduction line items.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Carrier & Trip Association */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="settlement-carrier" className="text-xs font-medium">
                Contracted Carrier <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="settlement-carrier"
                value={carrierId}
                onChange={(e) => setCarrierId(e.target.value)}
                required
                className="h-9 text-sm"
              >
                <NativeSelectOption value="">Select carrier...</NativeSelectOption>
                {carriers.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name} {c.mcNumber ? `(${c.mcNumber})` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settlement-trip" className="text-xs font-medium">
                Linked Trip (Optional)
              </Label>
              <NativeSelect
                id="settlement-trip"
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="h-9 text-sm"
              >
                <NativeSelectOption value="">No linked trip</NativeSelectOption>
                {trips.map((t) => (
                  <NativeSelectOption key={t.id} value={t.id}>
                    Trip #{t.tripNumber} {t.loadNumber ? `(Load #${t.loadNumber})` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* Invoice # & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="carrier-invoice-num" className="text-xs font-medium">
                Carrier Invoice / Freight Bill #
              </Label>
              <Input
                id="carrier-invoice-num"
                placeholder="e.g. INV-88492"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settlement-currency" className="text-xs font-medium">
                Settlement Currency
              </Label>
              <NativeSelect
                id="settlement-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 text-sm"
              >
                {allCurrencies.map((c) => (
                  <NativeSelectOption key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Calculator className="h-3.5 w-3.5 text-primary" />
              Settlement Rate & Accessorials
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="base-amount" className="text-xs font-medium">
                  Agreed Rate ({currency}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="base-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="additions-amount" className="text-xs font-medium">
                  + Additions (Detention/TONU)
                </Label>
                <Input
                  id="additions-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={additions}
                  onChange={(e) => setAdditions(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deductions-amount" className="text-xs font-medium">
                  - Deductions (Claims/Advances)
                </Label>
                <Input
                  id="deductions-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Computed Net Pay Ribbon */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-background border mt-2">
              <span className="text-xs font-medium text-muted-foreground">Net Carrier Remittance:</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground font-mono">{currency}</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ${computedNet}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="settlement-notes" className="text-xs font-medium">
              Settlement Notes / Memo
            </Label>
            <Input
              id="settlement-notes"
              placeholder="e.g. 2 hrs detention approved at consignee dock; quickpay terms applied"
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
              Create Settlement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
