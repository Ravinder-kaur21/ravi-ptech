"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Receipt, Plus, DollarSign, Calendar, Truck, User } from "lucide-react"
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
import { createExpenseAction } from "@/app/actions/tms-ap"

const EXPENSE_CATEGORIES = [
  "Fuel",
  "Tolls",
  "Scales",
  "Lumpers",
  "DEF",
  "Maintenance & Repairs",
  "Lodging",
  "Permits",
  "Washout",
  "Other",
]

interface TripOption {
  id: string
  tripNumber: string
  loadNumber?: string | null
}

interface DriverOption {
  id: string
  firstName: string
  lastName: string
}

export function RecordExpenseDialog({
  trips = [],
  drivers = [],
  defaultTripId,
}: {
  trips?: TripOption[]
  drivers?: DriverOption[]
  defaultTripId?: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const [type, setType] = React.useState("Fuel")
  const [vendor, setVendor] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [tripId, setTripId] = React.useState(defaultTripId || "")
  const [driverId, setDriverId] = React.useState("")
  const [receipt, setReceipt] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor.trim() || !amount.trim()) {
      toast.error("Please provide vendor name and amount")
      return
    }

    startTransition(async () => {
      const res = await createExpenseAction({
        type,
        vendor: vendor.trim(),
        amount: amount.trim(),
        date,
        tripId: tripId || null,
        driverId: driverId || null,
        receipt: receipt.trim() || null,
        notes: notes.trim() || null,
      })

      if (res.success) {
        toast.success(`Expense of $${amount} recorded successfully`)
        setOpen(false)
        setVendor("")
        setAmount("")
        setReceipt("")
        setNotes("")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to record expense")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-soft cursor-pointer"
          >
            <Plus className="size-3.5" />
            Record Expense
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
              <Receipt className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-brand-ink">
              Record AP Trip Expense
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expType">Expense Category *</Label>
              <NativeSelect
                id="expType"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <NativeSelectOption key={cat} value={cat}>
                    {cat}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expAmount">Amount ($ USD) *</Label>
              <Input
                id="expAmount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="245.50"
                inputMode="decimal"
                className="font-mono text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expVendor">Vendor / Merchant *</Label>
              <Input
                id="expVendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Love's Travel Stop #312"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expDate">Expense Date *</Label>
              <Input
                id="expDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-rule/60">
            <div className="space-y-1.5">
              <Label htmlFor="expTrip">Associated Trip</Label>
              <NativeSelect
                id="expTrip"
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
              >
                <NativeSelectOption value="">— No Trip Assigned —</NativeSelectOption>
                {trips.map((t) => (
                  <NativeSelectOption key={t.id} value={t.id}>
                    {t.tripNumber} {t.loadNumber ? `(${t.loadNumber})` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expDriver">Driver / Payee</Label>
              <NativeSelect
                id="expDriver"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <NativeSelectOption value="">— Select Driver —</NativeSelectOption>
                {drivers.map((d) => (
                  <NativeSelectOption key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-brand-rule/60">
            <Label htmlFor="expReceipt">Receipt / Invoice Ref #</Label>
            <Input
              id="expReceipt"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              placeholder="e.g. RCP-99410 or image URL"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expNotes">Description / Notes</Label>
            <Input
              id="expNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 50 gallons diesel + DEF refill in Oklahoma City"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-brand-rule">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-brand-muted-soft hover:text-brand-ink"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-brand-ink px-5 text-xs text-brand-cream hover:bg-brand-ink-soft cursor-pointer"
            >
              {isPending ? <Spinner /> : "Save Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
