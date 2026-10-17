"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  Receipt,
  Plus,
  DollarSign,
  Calendar,
  Truck,
  User,
  Fuel,
  CreditCard,
  Scale,
  Boxes,
  Wrench,
  Hotel,
  ShieldCheck,
  ArrowRight,
  Loader2,
  FileText,
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
import { createExpenseAction } from "@/app/actions/tms-ap"

const CATEGORIES = [
  { id: "Fuel", label: "Diesel Fuel", icon: Fuel, popular: true },
  { id: "DEF", label: "DEF Fluid", icon: Fuel, popular: true },
  { id: "Tolls", label: "Highway Tolls", icon: CreditCard, popular: true },
  { id: "Scales", label: "CAT Scale Ticket", icon: Scale, popular: true },
  { id: "Lumpers", label: "Lumper Unload", icon: Boxes, popular: false },
  { id: "Maintenance & Repairs", label: "Maintenance", icon: Wrench, popular: false },
  { id: "Lodging", label: "Driver Hotel", icon: Hotel, popular: false },
  { id: "Washout", label: "Trailer Washout", icon: Truck, popular: false },
  { id: "Permits", label: "Oversize Permit", icon: FileText, popular: false },
  { id: "Other", label: "Other Expense", icon: Receipt, popular: false },
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
  const [driverId, setDriverId] = React.useState(drivers[0]?.id || "")
  const [receipt, setReceipt] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const amountNum = parseFloat(amount) || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor.trim() || !amount.trim()) {
      toast.error("Please provide vendor name and amount.")
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
        toast.success(`Expense of $${amount} recorded successfully!`)
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
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-hover transition-colors shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          Record Expense
        </span>
      </ModalTrigger>

      <ModalBody className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* ─── Studio Header ─── */}
          <div className="px-6 py-6 border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec] dark:bg-zinc-900/60 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 size-36 rounded-full bg-[#d9622b]/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a8b8f]">
                EXPENSE & FLEET DISBURSEMENTS · AP
              </span>
            </div>

            <h2 className="font-serif text-[28px] leading-tight font-normal text-[#16181d] dark:text-zinc-100">
              Record Trip <span className="italic text-[#d9622b]">Expense</span>
            </h2>

            <p className="mt-1 text-xs text-[#73757a] dark:text-zinc-400">
              Log fuel purchases, highway tolls, scale tickets, and driver reimbursements against active dispatches.
            </p>
          </div>

          {/* ─── Modal Content Canvas ─── */}
          <ModalContent className="space-y-6 pt-5 pb-6">
            {/* 1. Category Quick-Chips */}
            <div className="space-y-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block">
                Select Expense Classification *
              </span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = type === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer",
                        isSelected
                          ? "border-[#d9622b] bg-[#fff0e6] text-[#d9622b] font-semibold shadow-xs ring-1 ring-[#d9622b]"
                          : "border-[#d1ccc5] bg-white text-[#16181d] hover:border-[#b8b1a7] hover:bg-[#fffefb]"
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Amount & Vendor */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Total Amount (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-[#73757a]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="245.50"
                    className="h-12 w-full rounded-2xl border border-[#d1ccc5] bg-white pl-8 pr-3 font-mono text-lg font-bold text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Vendor / Location *
                </label>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Love's Travel Stop #420"
                  className="h-12 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                  required
                />
              </div>
            </div>

            {/* 3. Trip & Driver Linking */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Linked Trip / Dispatch
                </label>
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 font-mono text-xs text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                >
                  <option value="">No trip linked (General Fleet Overhead)</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tripNumber} {t.loadNumber ? `(Load ${t.loadNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Driver / Cardholder
                </label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-xs text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                >
                  <option value="">No driver specified (Company card)</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Date & Receipt Reference */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-xs text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                  Receipt # / Pump Authorization{" "}
                  <span className="text-[#a8a29a] normal-case tracking-normal">— Optional</span>
                </label>
                <input
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="e.g. AUTH-99210 or Slip #48"
                  className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 font-mono text-xs text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                Itemized Details / Gallons / Odometer Notes{" "}
                <span className="text-[#a8a29a] normal-case tracking-normal">— Optional</span>
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 110 gallons @ $3.89/gal, Reefer fuel filled, Scale ticket verified"
                className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-xs text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
              />
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
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9622b] px-8 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Posting Expense...</span>
                </>
              ) : (
                <>
                  <span>Record & Post Expense {amountNum > 0 ? `($${amountNum.toFixed(2)})` : ""}</span>
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
