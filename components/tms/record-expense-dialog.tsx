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
  Wrench,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Loader2,
  FileText,
  MapPin,
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createExpenseAction } from "@/app/actions/tms-ap"

// ─── 4 Clean Category Groups (Kokonut / Shadcn Hybrid) ───
const CATEGORY_GROUPS = [
  {
    id: "fuel",
    label: "Fuel",
    icon: Fuel,
    subtypes: [
      { id: "Fuel", label: "Diesel Fuel" },
      { id: "DEF", label: "DEF Fluid" },
      { id: "Reefer Fuel", label: "Reefer Tank" },
    ],
  },
  {
    id: "road",
    label: "Road & Tolls",
    icon: CreditCard,
    subtypes: [
      { id: "Tolls", label: "Highway Tolls" },
      { id: "Scales", label: "CAT Scale" },
      { id: "Permits", label: "Route Permits" },
    ],
  },
  {
    id: "shop",
    label: "Service",
    icon: Wrench,
    subtypes: [
      { id: "Maintenance & Repairs", label: "Repairs" },
      { id: "Washout", label: "Trailer Wash" },
      { id: "Tires", label: "Tire Repair" },
    ],
  },
  {
    id: "fleet",
    label: "Fleet / Misc",
    icon: Receipt,
    subtypes: [
      { id: "Lumpers", label: "Lumper Fee" },
      { id: "Lodging", label: "Driver Hotel" },
      { id: "Other", label: "Other AP" },
    ],
  },
]

// Common vendor quick-fills for 1-click rapid logging
const VENDOR_PRESETS = [
  "Love's Travel Stop",
  "Pilot Flying J",
  "TA Petro",
  "CAT Scale",
  "E-ZPass / SunPass",
]

// Fast amount increment chips
const AMOUNT_PRESETS = [25, 50, 100, 250]

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

  // Primary State
  const [activeGroupId, setActiveGroupId] = React.useState("fuel")
  const [type, setType] = React.useState("Fuel")
  const [amount, setAmount] = React.useState("")
  const [vendor, setVendor] = React.useState("")

  // Secondary Details (Progressive Disclosure)
  const [showDetails, setShowDetails] = React.useState(false)
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [tripId, setTripId] = React.useState(defaultTripId || "")
  const [driverId, setDriverId] = React.useState(drivers[0]?.id || "")
  const [receipt, setReceipt] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const amountNum = parseFloat(amount) || 0
  const activeGroup = CATEGORY_GROUPS.find((g) => g.id === activeGroupId) || CATEGORY_GROUPS[0]

  const handleGroupSelect = (group: typeof CATEGORY_GROUPS[0]) => {
    setActiveGroupId(group.id)
    setType(group.subtypes[0].id)
  }

  const handleBumpAmount = (delta: number) => {
    const current = parseFloat(amount) || 0
    setAmount((current + delta).toFixed(2))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor.trim() || amountNum <= 0) {
      toast.error("Please provide a valid amount and vendor.")
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
        toast.success(`Expense of $${amountNum.toFixed(2)} recorded successfully!`)
        setOpen(false)
        setVendor("")
        setAmount("")
        setReceipt("")
        setNotes("")
        setShowDetails(false)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to record expense")
      }
    })
  }

  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-accent px-4 text-xs font-medium text-white hover:bg-brand-accent-hover transition-colors shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          Record Expense
        </span>
      </ModalTrigger>

      {/* ─── Compact Aceternity-Inspired Body (max-w-[460px]) ─── */}
      <ModalBody className="max-w-[460px] overflow-hidden p-0 border border-[#d1ccc5] dark:border-zinc-800 shadow-2xl rounded-3xl bg-[#fdfbf7] dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* ─── Header: Sleek & Compact ─── */}
          <div className="px-5 pt-5 pb-3 border-b border-[#e4ddd3] dark:border-zinc-800/80 bg-[#f7f3ec]/80 dark:bg-zinc-900/40 relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8b8f]">
                AP · Quick Disbursement
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#16181d] dark:text-zinc-100">
              Record <span className="italic text-[#d9622b]">Expense</span>
            </h2>
          </div>

          {/* ─── Hero Amount Display (Fintech / Ramp Style) ─── */}
          <div className="px-5 py-4 bg-gradient-to-b from-[#f7f3ec]/40 to-transparent flex flex-col items-center justify-center border-b border-[#e8e2d8] dark:border-zinc-800">
            <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] mb-1">
              Expense Amount (USD)
            </label>
            <div className="relative flex items-center justify-center">
              <span className="font-mono text-2xl font-bold text-[#8a8b8f] mr-1">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-48 text-center font-mono text-3xl font-bold text-[#16181d] dark:text-zinc-100 bg-transparent focus:outline-none placeholder:text-[#d1ccc5]"
                required
              />
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center gap-1.5 mt-2.5">
              {AMOUNT_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleBumpAmount(amt)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#16181d] dark:text-zinc-300 hover:border-[#d9622b] hover:text-[#d9622b] transition-all cursor-pointer shadow-2xs"
                >
                  +${amt}
                </button>
              ))}
              {amountNum > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-2 py-1 text-[11px] font-mono text-[#8a8b8f] hover:text-[#16181d] transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ─── Scrollable Form Canvas ─── */}
          <div className="px-5 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* 1. Category Gliding Tab Bar (Kokonut Smooth Tab inspired) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f]">
                  Category Classification
                </span>
                <span className="font-mono text-[11px] font-semibold text-[#d9622b]">
                  {type}
                </span>
              </div>

              {/* 4 Primary Segmented Pills */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#eee9df] dark:bg-zinc-800/80 border border-[#e4ddd3] dark:border-zinc-700">
                {CATEGORY_GROUPS.map((g) => {
                  const Icon = g.icon
                  const isSelected = activeGroupId === g.id
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleGroupSelect(g)}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer relative",
                        isSelected
                          ? "bg-white dark:bg-zinc-900 text-[#16181d] dark:text-zinc-100 shadow-xs font-semibold"
                          : "text-[#73757a] hover:text-[#16181d] dark:hover:text-zinc-300"
                      )}
                    >
                      <Icon className={cn("size-3.5 mb-0.5", isSelected ? "text-[#d9622b]" : "text-[#8a8b8f]")} />
                      <span className="truncate w-full text-center">{g.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Sub-type Selection Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeGroup.subtypes.map((sub) => {
                  const isSubSelected = type === sub.id
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setType(sub.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border",
                        isSubSelected
                          ? "bg-[#fff0e6] dark:bg-orange-950/40 border-[#d9622b] text-[#d9622b] font-medium"
                          : "bg-white dark:bg-zinc-900 border-[#e4ddd3] dark:border-zinc-800 text-[#73757a] hover:border-[#b8b1a7]"
                      )}
                    >
                      {isSubSelected && <Check className="size-3" />}
                      <span>{sub.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Vendor / Location Input */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block">
                Vendor / Location *
              </label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Love's Travel Stop #420"
                className="h-10 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 placeholder:text-[#a8a29a] focus:border-[#d9622b] focus:outline-none transition-colors shadow-2xs"
                required
              />

              {/* Vendor Quick Chips */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {VENDOR_PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setVendor(p)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#eee9df]/60 hover:bg-[#eee9df] text-[#55575b] transition-colors cursor-pointer"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Progressive Disclosure: Trip, Driver & Audit Info (Shadcn Collapsible) */}
            <div className="border border-[#e4ddd3] dark:border-zinc-800 rounded-2xl overflow-hidden bg-[#f7f3ec]/40 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-[#16181d] dark:text-zinc-200 hover:bg-[#f7f3ec] dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-[#d9622b]" />
                  <span>Dispatch, Driver & Slip Details</span>
                  {(tripId || driverId || receipt) && (
                    <span className="size-1.5 rounded-full bg-[#d9622b]" />
                  )}
                </div>
                {showDetails ? (
                  <ChevronUp className="size-3.5 text-[#8a8b8f]" />
                ) : (
                  <ChevronDown className="size-3.5 text-[#8a8b8f]" />
                )}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 pt-1 space-y-3 border-t border-[#e4ddd3] dark:border-zinc-800 text-xs">
                      {/* Linked Trip */}
                      <div>
                        <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                          Linked Dispatch / Trip
                        </label>
                        <select
                          value={tripId}
                          onChange={(e) => setTripId(e.target.value)}
                          className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-200 focus:border-[#d9622b] focus:outline-none transition-colors"
                        >
                          <option value="">General Overhead (No active trip)</option>
                          {trips.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.tripNumber} {t.loadNumber ? `(Load ${t.loadNumber})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Driver & Date Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                            Driver / Cardholder
                          </label>
                          <select
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value)}
                            className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-[#16181d] dark:text-zinc-200 focus:border-[#d9622b] focus:outline-none transition-colors"
                          >
                            <option value="">Company Card</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.firstName} {d.lastName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-[#16181d] dark:text-zinc-200 focus:border-[#d9622b] focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Receipt Slip # */}
                      <div>
                        <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                          Pump Auth / Receipt Slip #
                        </label>
                        <input
                          value={receipt}
                          onChange={(e) => setReceipt(e.target.value)}
                          placeholder="e.g. AUTH-49102"
                          className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-200 focus:border-[#d9622b] focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Itemized Notes */}
                      <div>
                        <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                          Gallons / Odometer Notes
                        </label>
                        <input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. 112 gal @ $3.89, CAT scale verified"
                          className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-[#16181d] dark:text-zinc-200 focus:border-[#d9622b] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 4. Physical Perforated Thermal Receipt Slip Preview (Kokonut Receipt flair) */}
            <div className="pt-1">
              <div className="rounded-xl border border-dashed border-[#d1ccc5] dark:border-zinc-700 p-2.5 bg-[#fdfbf7] dark:bg-zinc-900 flex items-center justify-between font-mono text-[10px] text-[#73757a]">
                <div className="flex items-center gap-1.5">
                  <Receipt className="size-3 text-[#d9622b]" />
                  <span className="uppercase font-semibold tracking-wider">
                    {vendor.trim() || "Unassigned Vendor"}
                  </span>
                </div>
                <span className="font-bold text-[#16181d] dark:text-zinc-200">
                  {amountNum > 0 ? `$${amountNum.toFixed(2)}` : "$0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Sleek Footer Actions ─── */}
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
              disabled={isPending || amountNum <= 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#d9622b] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Posting Expense...</span>
                </>
              ) : (
                <>
                  <span>Post Expense {amountNum > 0 ? `($${amountNum.toFixed(2)})` : ""}</span>
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
