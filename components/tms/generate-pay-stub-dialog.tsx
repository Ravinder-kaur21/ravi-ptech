"use client"

import * as React from "react"
import { Banknote, Plus, Loader2, Calendar } from "lucide-react"
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
import { generatePayStubAction } from "@/app/actions/tms-payroll"

interface DriverOption {
  id: string
  firstName: string
  lastName: string
  payType?: string | null
  payRate?: string | null
}

interface GeneratePayStubDialogProps {
  drivers: DriverOption[]
}

export function GeneratePayStubDialog({ drivers }: GeneratePayStubDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const [driverId, setDriverId] = React.useState(drivers[0]?.id || "")
  const [periodStart, setPeriodStart] = React.useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })
  const [periodEnd, setPeriodEnd] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [totalMiles, setTotalMiles] = React.useState("")
  const [grossPay, setGrossPay] = React.useState("")
  const [deductions, setDeductions] = React.useState("0.00")
  const [notes, setNotes] = React.useState("")

  const selectedDriver = React.useMemo(() => {
    return drivers.find((d) => d.id === driverId)
  }, [drivers, driverId])

  const calculatedNetPay = React.useMemo(() => {
    const g = parseFloat(grossPay || "0")
    const d = parseFloat(deductions || "0")
    return Math.max(0, g - d).toFixed(2)
  }, [grossPay, deductions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driverId) {
      toast.error("Please select a driver")
      return
    }
    if (!grossPay || parseFloat(grossPay) <= 0) {
      toast.error("Valid gross pay amount required")
      return
    }

    setLoading(true)
    try {
      const res = await generatePayStubAction({
        driverId,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        totalMiles: totalMiles.trim() || null,
        payRate: selectedDriver?.payRate || null,
        grossPay,
        deductions: deductions.trim() || "0",
        netPay: calculatedNetPay,
        notes: notes.trim() || null,
      })

      if (res.ok) {
        toast.success("Driver settlement statement generated")
        setOpen(false)
        setGrossPay("")
        setNotes("")
      } else {
        toast.error(res.error || "Failed to generate settlement")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate settlement")
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
            className="h-8.5 rounded-full bg-brand-ink hover:bg-brand-ink-hover text-brand-cream text-xs font-medium px-4 gap-1.5 shadow-2xs"
          />
        }
      >
        <Plus className="size-3.5 text-[#d9622b]" />
        New Settlement
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] bg-[#fdfbf7] dark:bg-zinc-950 border-[#e4ddd3] dark:border-zinc-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#fff0e6] dark:bg-orange-950/40 text-[#d9622b]">
                <Banknote className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-[#16181d] dark:text-zinc-100">
                Generate Driver Settlement
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#73757a]">
              Create an official driver pay stub statement aggregating mileage, line pay, and deductions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-4 text-xs">
            {/* Driver Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="drvId" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                Commercial Driver *
              </Label>
              <NativeSelect
                id="drvId"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="text-xs bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
                required
              >
                {drivers.map((d) => (
                  <NativeSelectOption key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} ({d.payType || "Standard"} — {d.payRate || "$/unit"})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            {/* Pay Period Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pStart" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                  Period Start *
                </Label>
                <Input
                  id="pStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="text-xs font-mono bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pEnd" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                  Period End *
                </Label>
                <Input
                  id="pEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="text-xs font-mono bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
                  required
                />
              </div>
            </div>

            {/* Miles & Gross Pay */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tMiles" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                  Total Dispatched Miles
                </Label>
                <Input
                  id="tMiles"
                  value={totalMiles}
                  onChange={(e) => setTotalMiles(e.target.value)}
                  placeholder="2,450"
                  className="text-xs font-mono bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gPay" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                  Gross Pay ($) *
                </Label>
                <Input
                  id="gPay"
                  value={grossPay}
                  onChange={(e) => setGrossPay(e.target.value)}
                  placeholder="1,650.00"
                  className="text-xs font-mono font-bold bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
                  required
                />
              </div>
            </div>

            {/* Deductions & Net Pay Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pDed" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                  Deductions ($)
                </Label>
                <Input
                  id="pDed"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  placeholder="0.00"
                  className="text-xs font-mono text-red-600 bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                  Calculated Net Settlement
                </Label>
                <div className="h-9 px-3 flex items-center font-mono font-bold text-sm rounded-md bg-[#f7f3ec] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 text-emerald-700 dark:text-emerald-400">
                  ${calculatedNetPay}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="sNotes" className="text-xs font-medium text-[#16181d] dark:text-zinc-200">
                Settlement Notes (Optional)
              </Label>
              <Input
                id="sNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Weekly settlement including layover bonus"
                className="text-xs bg-[#fdfbf7] dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-8 text-xs border-[#e4ddd3] dark:border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 text-xs bg-[#16181d] hover:bg-[#16181d]/90 text-[#fdfbf7] dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Create Settlement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
