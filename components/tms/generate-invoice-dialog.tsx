"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Plus,
  FileText,
  Loader2,
  DollarSign,
  Calendar,
  Sparkles,
  Building2,
  CheckCircle2,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/animated-modal"
import { cn } from "@/lib/utils"
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

const ACCESSORIAL_PRESETS = [
  { label: "Detention", amount: 75, desc: "1 hr dock delay" },
  { label: "Lumper Fee", amount: 150, desc: "Pallet unloading" },
  { label: "Pallet Jack", amount: 50, desc: "Inside delivery" },
  { label: "Stop-off Fee", amount: 100, desc: "Extra route drop" },
  { label: "Layover", amount: 250, desc: "Overnight facility delay" },
]

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

  // Pre-fill fields when selecting a delivered load
  const handleSelectLoad = (load: DeliveredLoad) => {
    setSelectedLoadId(load.id)
    setCustomerName(load.customerName || "")
    setBaseRate(load.rate || "0")
    setInvoiceNumber(`INV-${load.loadNumber}`)
  }

  React.useEffect(() => {
    if (preselectedLoadId && deliveredLoads.length > 0) {
      const match = deliveredLoads.find((l) => l.id === preselectedLoadId)
      if (match) handleSelectLoad(match)
    }
  }, [preselectedLoadId, deliveredLoads])

  const baseRateNum = parseFloat(baseRate) || 0
  const fuelNum = parseFloat(fuelSurcharge) || 0
  const accessorialsNum = parseFloat(accessorials) || 0
  const totalAmount = (baseRateNum + fuelNum + accessorialsNum).toFixed(2)

  const handleAddAccessorial = (amt: number) => {
    const current = parseFloat(accessorials) || 0
    setAccessorials((current + amt).toString())
  }

  const handleAutoFuel = (percentage: number) => {
    if (baseRateNum > 0) {
      const calculatedFuel = ((baseRateNum * percentage) / 100).toFixed(2)
      setFuelSurcharge(calculatedFuel)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      toast.error("Customer name is required.")
      return
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Invoice total amount must be greater than zero.")
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
        toast.success(`Invoice ${res.invoiceNumber} generated & recorded!`)
        setOpen(false)
        setSelectedLoadId("")
        setCustomerName("")
        setCustomerEmail("")
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

  const selectedLoad = deliveredLoads.find((l) => l.id === selectedLoadId)

  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-hover transition-colors shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          Create Invoice
        </span>
      </ModalTrigger>

      <ModalBody className="max-w-3xl">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* ─── Studio Header ─── */}
          <div className="px-6 py-6 border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec] dark:bg-zinc-900/60 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 size-36 rounded-full bg-[#d9622b]/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a8b8f]">
                BILLING STUDIO · ACCOUNTS RECEIVABLE
              </span>
            </div>

            <h2 className="font-serif text-[28px] leading-tight font-normal text-[#16181d] dark:text-zinc-100">
              Generate Customer <span className="italic text-[#d9622b]">Invoice</span>
            </h2>

            <p className="mt-1 text-xs text-[#73757a] dark:text-zinc-400">
              Bill freight shippers for delivered loads or generate a standalone commercial logistics statement.
            </p>
          </div>

          {/* ─── Modal Content Canvas ─── */}
          <ModalContent className="space-y-6 pt-5 pb-6">
            {/* 1. Delivered Load Quick-Selector Cards */}
            {deliveredLoads.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                    Delivered Freight Ready for Invoicing
                  </span>
                  <span className="font-mono text-[11px] text-[#d9622b]">
                    {deliveredLoads.length} Uninvoiced Load{deliveredLoads.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                  {deliveredLoads.map((l) => {
                    const isSelected = selectedLoadId === l.id
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleSelectLoad(l)}
                        className={cn(
                          "flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer",
                          isSelected
                            ? "border-[#d9622b] bg-[#fff0e6] shadow-[0_2px_12px_rgba(217,98,43,0.12)] ring-1 ring-[#d9622b]"
                            : "border-[#d1ccc5] bg-white hover:border-[#b8b1a7] hover:bg-[#fffefb]"
                        )}
                      >
                        <div
                          className={cn(
                            "size-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-[#d9622b] text-white"
                              : "bg-[#eee9df] text-[#16181d]"
                          )}
                        >
                          <Truck className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#16181d]">
                              {l.loadNumber}
                            </span>
                            <span className="font-mono text-xs font-semibold text-[#d9622b]">
                              ${parseFloat(l.rate || "0").toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium text-[#16181d] truncate mt-0.5">
                            {l.customerName || "Customer Shipper"}
                          </p>
                          <p className="text-[11px] text-[#73757a] truncate">
                            {l.originCity ? `${l.originCity}, ${l.originState} → ${l.destCity}, ${l.destState}` : "Standard Route"}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. Customer & Invoice Identifiers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Customer / Shipper Name *
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Walmart Logistics, Target"
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Invoice Number *
                </label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-10029"
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 font-mono text-[14px] font-semibold text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                  required
                />
              </div>
            </div>

            {/* 3. Financial Line Items */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Linehaul Base Rate *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[#73757a]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    placeholder="2500.00"
                    className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white pl-8 pr-3 font-mono text-[14px] font-semibold text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                    Fuel Surcharge
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoFuel(12)}
                    className="font-mono text-[10px] text-[#d9622b] hover:underline"
                    title="Calculate 12% standard fuel surcharge"
                  >
                    +12% auto
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[#73757a]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelSurcharge}
                    onChange={(e) => setFuelSurcharge(e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white pl-8 pr-3 font-mono text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Accessorial Charges
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[#73757a]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={accessorials}
                    onChange={(e) => setAccessorials(e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white pl-8 pr-3 font-mono text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Quick Accessorial Preset Chips */}
            <div>
              <span className="font-mono text-[10px] uppercase text-[#8a8b8f] tracking-[0.04em] block mb-2">
                Quick-add accessorial fees:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ACCESSORIAL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleAddAccessorial(p.amount)}
                    className="px-3 py-1 rounded-full text-xs border border-[#d1ccc5] bg-white hover:border-[#d9622b] hover:bg-[#fff0e6] transition-colors text-[#16181d] font-medium cursor-pointer shadow-xs"
                  >
                    + {p.label} (${p.amount})
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Thermal Receipt & Statement Summary Preview */}
            <div className="rounded-2xl border border-[#d1ccc5] bg-white p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#e4ddd3] pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-[#d9622b]" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                    LIVE INVOICE RECEIPT STATEMENT
                  </span>
                </div>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#f7f3ec] border border-[#e4ddd3] text-[#73757a]">
                  Net 30 Standard
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs text-[#73757a]">
                <div className="flex justify-between">
                  <span>Linehaul Freight</span>
                  <span className="text-[#16181d] font-semibold">${baseRateNum.toFixed(2)}</span>
                </div>

                {fuelNum > 0 && (
                  <div className="flex justify-between">
                    <span>Fuel Surcharge</span>
                    <span className="text-[#16181d] font-semibold">+${fuelNum.toFixed(2)}</span>
                  </div>
                )}

                {accessorialsNum > 0 && (
                  <div className="flex justify-between">
                    <span>Accessorial Services</span>
                    <span className="text-[#16181d] font-semibold">+${accessorialsNum.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-[#e4ddd3] pt-2.5 flex justify-between items-center text-sm font-bold text-[#16181d]">
                  <span>Total Due Shipper</span>
                  <span className="text-[#d9622b] text-base font-bold">${totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Email & Payment Due Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Billing Contact Email{" "}
                  <span className="text-[#a8a29a] normal-case tracking-normal">— Optional</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ap@shipper.com"
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Payment Due Date{" "}
                  <span className="text-[#a8a29a] normal-case tracking-normal">— Defaults Net 30</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                />
              </div>
            </div>
          </ModalContent>

          {/* ─── Modal Footer ─── */}
          <ModalFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[#73757a] hover:text-[#16181d] transition-colors px-3 py-2 cursor-pointer"
            >
              Cancel & Dismiss
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9622b] px-8 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <>
                  <span>Issue & Finalize Invoice (${totalAmount})</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </ModalFooter>
        </form>
      </ModalBody>
    </Modal>
  )
}
