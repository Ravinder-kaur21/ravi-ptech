"use client"

import * as React from "react"
import { Plus, FileText, Loader2, DollarSign, Calendar } from "lucide-react"
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
import { createInvoiceAction } from "@/app/actions/tms-billing"

interface DeliveredLoad {
  id: string
  loadNumber: string
  customerName?: string | null
  rate?: string | null
  originCity?: string | null
  originState?: string | null
  destCity?: string | null
  destState?: string | null
}

interface GenerateInvoiceDialogProps {
  deliveredLoads: DeliveredLoad[]
  preselectedLoadId?: string
}

export function GenerateInvoiceDialog({
  deliveredLoads,
  preselectedLoadId,
}: GenerateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [selectedLoadId, setSelectedLoadId] = React.useState(preselectedLoadId || "")
  const [invoiceNumber, setInvoiceNumber] = React.useState(`INV-${Date.now().toString().slice(-6)}`)
  const [customerName, setCustomerName] = React.useState("")
  const [customerEmail, setCustomerEmail] = React.useState("")
  const [baseRate, setBaseRate] = React.useState("")
  const [fuelSurcharge, setFuelSurcharge] = React.useState("0")
  const [accessorials, setAccessorials] = React.useState("0")
  const [dueDate, setDueDate] = React.useState("")
  const [notes, setNotes] = React.useState("")

  // When a load is selected, pre-fill fields
  React.useEffect(() => {
    if (selectedLoadId) {
      const match = deliveredLoads.find((l) => l.id === selectedLoadId)
      if (match) {
        setCustomerName(match.customerName || "")
        setBaseRate(match.rate || "")
        setInvoiceNumber(`INV-${match.loadNumber}`)
      }
    }
  }, [selectedLoadId, deliveredLoads])

  const totalAmount = (
    (parseFloat(baseRate) || 0) +
    (parseFloat(fuelSurcharge) || 0) +
    (parseFloat(accessorials) || 0)
  ).toFixed(2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      toast.error("Customer name is required")
      return
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Invoice total must be greater than zero")
      return
    }

    setLoading(true)
    try {
      const res = await createInvoiceAction({
        invoiceNumber: invoiceNumber.trim(),
        loadId: selectedLoadId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        amount: totalAmount,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
      })

      if (res.ok) {
        toast.success(`Invoice ${res.invoiceNumber} created successfully`)
        setOpen(false)
        setSelectedLoadId("")
        setCustomerName("")
        setBaseRate("")
        setFuelSurcharge("0")
        setAccessorials("0")
      } else {
        toast.error(res.error || "Failed to create invoice")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invoice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-9 gap-1.5 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-soft" />
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Create invoice
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-brand-card border-brand-rule">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
                <FileText className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-brand-ink">
                Generate Customer Invoice
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-brand-muted-soft">
              Bill a customer for completed freight runs or create a standalone billing statement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-xs">
            {/* Delivered Load Picker */}
            {deliveredLoads.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="loadSelect" className="text-xs font-medium text-brand-ink">
                  Bill from Delivered Load (Optional)
                </Label>
                <NativeSelect
                  id="loadSelect"
                  value={selectedLoadId}
                  onChange={(e) => setSelectedLoadId(e.target.value)}
                  className="text-xs"
                >
                  <NativeSelectOption value="">Custom Invoice / Standalone</NativeSelectOption>
                  {deliveredLoads.map((l) => (
                    <NativeSelectOption key={l.id} value={l.id}>
                      Load {l.loadNumber} — {l.customerName || "Customer"} (${l.rate || "0"})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invNum" className="text-xs font-medium text-brand-ink">
                  Invoice # *
                </Label>
                <Input
                  id="invNum"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-1001"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-medium text-brand-ink">
                  Payment Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cName" className="text-xs font-medium text-brand-ink">
                  Customer / Broker Name *
                </Label>
                <Input
                  id="cName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="C.H. Robinson"
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cEmail" className="text-xs font-medium text-brand-ink">
                  Billing Email
                </Label>
                <Input
                  id="cEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ap@broker.com"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Financial Line Items */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="baseRate" className="text-xs font-medium text-brand-ink">
                  Linehaul Rate ($) *
                </Label>
                <Input
                  id="baseRate"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  placeholder="2400.00"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fuel" className="text-xs font-medium text-brand-ink">
                  Fuel Surcharge ($)
                </Label>
                <Input
                  id="fuel"
                  value={fuelSurcharge}
                  onChange={(e) => setFuelSurcharge(e.target.value)}
                  placeholder="0.00"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accessorials" className="text-xs font-medium text-brand-ink">
                  Accessorials ($)
                </Label>
                <Input
                  id="accessorials"
                  value={accessorials}
                  onChange={(e) => setAccessorials(e.target.value)}
                  placeholder="0.00"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Total Highlight */}
            <div className="flex items-center justify-between rounded-lg bg-brand-cream-soft p-3 border border-brand-rule">
              <span className="font-mono text-xs uppercase tracking-[0.04em] text-brand-muted-soft">
                Invoice Gross Total
              </span>
              <span className="font-serif text-xl font-semibold text-brand-ink">
                ${totalAmount}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-brand-ink">
                Invoice Notes & Remittance Instructions
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms: Net 30. Direct remit to bank."
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
              className="h-8 text-xs bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Generate Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
