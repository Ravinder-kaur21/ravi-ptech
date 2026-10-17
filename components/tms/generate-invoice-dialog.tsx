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
  Receipt,
  ArrowRight,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react"
import { toast } from "sonner"
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
  { label: "Detention", amount: 75 },
  { label: "Lumper", amount: 150 },
  { label: "Pallet Jack", amount: 50 },
  { label: "Layover", amount: 250 },
]

export function GenerateInvoiceDialog({
  deliveredLoads,
  preselectedLoadId,
}: GenerateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  // Mode: "loads" or "custom"
  const [mode, setMode] = React.useState<"loads" | "custom">(
    deliveredLoads.length > 0 ? "loads" : "custom"
  )
  const [selectedLoadId, setSelectedLoadId] = React.useState(preselectedLoadId || "")
  const [invoiceNumber, setInvoiceNumber] = React.useState(
    `INV-${Date.now().toString().slice(-6)}`
  )
  const [customerName, setCustomerName] = React.useState("")
  const [customerEmail, setCustomerEmail] = React.useState("")
  const [baseRate, setBaseRate] = React.useState("")
  const [fuelSurcharge, setFuelSurcharge] = React.useState("0")
  const [accessorials, setAccessorials] = React.useState("0")
  const [dueDate, setDueDate] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [showOptional, setShowOptional] = React.useState(false)

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
      toast.info(`Calculated ${percentage}% fuel surcharge: $${calculatedFuel}`)
    } else {
      toast.error("Please enter a base rate first")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !baseRate.trim() || baseRateNum <= 0) {
      toast.error("Please provide Customer Name and a valid Linehaul Rate.")
      return
    }

    setLoading(true)
    try {
      const res = await createInvoiceAction({
        loadId: selectedLoadId || undefined,
        invoiceNumber,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        amount: totalAmount,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      })

      if (res.ok) {
        toast.success(`Invoice ${invoiceNumber} issued for $${totalAmount}!`)
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

      {/* ─── Compact Modal Body (max-w-[480px]) ─── */}
      <ModalBody className="max-w-[480px] overflow-hidden p-0 border border-[#d1ccc5] dark:border-zinc-800 shadow-2xl rounded-3xl bg-[#fdfbf7] dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/40 relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8b8f]">
                AR · Billing Studio
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#16181d] dark:text-zinc-100">
              Generate <span className="italic text-[#d9622b]">Invoice</span>
            </h2>
          </div>

          {/* Mode Switcher (Kokonut Gliding Pill) */}
          {deliveredLoads.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#eee9df] dark:bg-zinc-800/80 border border-[#e4ddd3] dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setMode("loads")}
                  className={cn(
                    "py-1.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    mode === "loads"
                      ? "bg-white dark:bg-zinc-900 text-[#16181d] dark:text-zinc-100 shadow-xs font-semibold"
                      : "text-[#73757a] hover:text-[#16181d]"
                  )}
                >
                  <Truck className="size-3.5" />
                  <span>Delivered Loads ({deliveredLoads.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("custom")
                    setSelectedLoadId("")
                  }}
                  className={cn(
                    "py-1.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    mode === "custom"
                      ? "bg-white dark:bg-zinc-900 text-[#16181d] dark:text-zinc-100 shadow-xs font-semibold"
                      : "text-[#73757a] hover:text-[#16181d]"
                  )}
                >
                  <FileText className="size-3.5" />
                  <span>Manual Bill</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="px-5 py-3 space-y-4 max-h-[52vh] overflow-y-auto">
            {/* Delivered Load Picker */}
            {mode === "loads" && deliveredLoads.length > 0 && (
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block">
                  Select Completed Delivery
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {deliveredLoads.map((l) => {
                    const isSelected = selectedLoadId === l.id
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleSelectLoad(l)}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs",
                          isSelected
                            ? "border-[#d9622b] bg-[#fff0e6] dark:bg-orange-950/30 text-[#16181d] ring-1 ring-[#d9622b]"
                            : "border-[#e4ddd3] dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#b8b1a7]"
                        )}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#16181d] dark:text-zinc-100">
                              {l.loadNumber}
                            </span>
                            <span className="text-[#73757a] truncate font-medium">
                              {l.customerName || "Shipper"}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8a8b8f] truncate mt-0.5">
                            {l.originCity ? `${l.originCity}, ${l.originState} → ${l.destCity}, ${l.destState}` : "Delivered Load"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-[#d9622b]">
                            ${parseFloat(l.rate || "0").toFixed(2)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Customer & Invoice Number */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block mb-1">
                  Customer / Shipper *
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Target, Sysco"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block mb-1">
                  Invoice Number *
                </label>
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Financial Line Items: Base Rate, Fuel, Accessorials */}
            <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                    Linehaul ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    placeholder="2500.00"
                    className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2.5 font-mono text-xs font-bold text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">
                      Fuel ($)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoFuel(12)}
                      className="font-mono text-[9px] text-[#d9622b] hover:underline"
                    >
                      12%
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelSurcharge}
                    onChange={(e) => setFuelSurcharge(e.target.value)}
                    placeholder="0.00"
                    className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                    Accessorial ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accessorials}
                    onChange={(e) => setAccessorials(e.target.value)}
                    placeholder="0.00"
                    className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick accessorial presets */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="font-mono text-[9px] text-[#8a8b8f] uppercase mr-1">Add:</span>
                {ACCESSORIAL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleAddAccessorial(p.amount)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-[#e4ddd3] dark:border-zinc-700 bg-[#f7f3ec] dark:bg-zinc-800 text-[#55575b] hover:border-[#d9622b] hover:text-[#d9622b] transition-colors cursor-pointer"
                  >
                    +{p.label} (${p.amount})
                  </button>
                ))}
              </div>
            </div>

            {/* Live Perforated Thermal Voucher Total */}
            <div className="rounded-xl border border-dashed border-[#d1ccc5] dark:border-zinc-700 p-3 bg-[#fdfbf7] dark:bg-zinc-900/50 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <Receipt className="size-3.5 text-[#d9622b]" />
                <span className="text-[#73757a] uppercase font-semibold tracking-wider text-[11px]">
                  Total Billed Statement:
                </span>
              </div>
              <span className="text-base font-bold text-[#d9622b]">${totalAmount}</span>
            </div>

            {/* Optional Details (Email & Due Date) */}
            <div className="border border-[#e4ddd3] dark:border-zinc-800 rounded-xl overflow-hidden bg-[#f7f3ec]/30 dark:bg-zinc-900/20">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#73757a] hover:text-[#16181d] transition-colors cursor-pointer"
              >
                <span>Billing Email & Terms (Optional)</span>
                {showOptional ? (
                  <ChevronUp className="size-3 text-[#8a8b8f]" />
                ) : (
                  <ChevronDown className="size-3 text-[#8a8b8f]" />
                )}
              </button>

              <AnimatePresence>
                {showOptional && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 pt-0 space-y-2 border-t border-[#e4ddd3] dark:border-zinc-800"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="font-mono text-[10px] uppercase text-[#8a8b8f] block mb-1">
                          Billing Contact Email
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="ap@shipper.com"
                          className="h-8 w-full rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-[#16181d]"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase text-[#8a8b8f] block mb-1">
                          Payment Due Date
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="h-8 w-full rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-[#16181d]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/90 dark:bg-zinc-900/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[#73757a] hover:text-[#16181d] transition-colors px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || baseRateNum <= 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#d9622b] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Issuing Invoice...</span>
                </>
              ) : (
                <>
                  <span>Issue Invoice (${totalAmount})</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  )
}
