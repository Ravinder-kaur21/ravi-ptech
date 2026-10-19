"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import {
  Send,
  Truck,
  Building2,
  AlertCircle,
  Check,
  TrendingUp,
  MapPin,
  Plus,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
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
import { dispatchLoadAction } from "@/app/actions/tms"

interface DispatchLoadDialogProps {
  loadId: string
  loadNumber: string
  shipperRate?: string | null
  laneSummary?: string | null
  equipmentRequirement?: string | null
  availableDrivers: {
    id: string
    firstName: string
    lastName: string
    status: string
    cdlExpiration?: Date | string | null
  }[]
  availableTrucks: {
    id: string
    unitNumber: string
    status: string
    currentLocation?: string | null
    make?: string | null
    model?: string | null
  }[]
  availableTrailers: {
    id: string
    unitNumber: string
    type?: string | null
    status: string
  }[]
  availableCarriers?: {
    id: string
    name: string
    mcNumber?: string | null
    dotNumber?: string | null
  }[]
  defaultCarrierRate?: string | null
}

export function DispatchLoadDialog({
  loadId,
  loadNumber,
  shipperRate,
  laneSummary,
  equipmentRequirement,
  availableDrivers,
  availableTrucks,
  availableTrailers,
  availableCarriers = [],
  defaultCarrierRate,
}: DispatchLoadDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [dispatchType, setDispatchType] = React.useState<"fleet" | "carrier">("fleet")

  // Company fleet state
  const [driverId, setDriverId] = React.useState(availableDrivers[0]?.id || "")
  const [truckId, setTruckId] = React.useState(availableTrucks[0]?.id || "")
  const [trailerId, setTrailerId] = React.useState(availableTrailers[0]?.id || "")

  // Outside carrier state
  const [carrierId, setCarrierId] = React.useState(availableCarriers[0]?.id || "")
  const [carrierRate, setCarrierRate] = React.useState(defaultCarrierRate || "")
  const [totalMiles, setTotalMiles] = React.useState("")

  // Financial spread calculations
  const contractedRateNum = parseFloat(shipperRate || "0") || 0
  const carrierRateNum = parseFloat(carrierRate || "0") || 0
  const grossProfit = contractedRateNum > 0 && carrierRateNum > 0 ? contractedRateNum - carrierRateNum : null
  const grossMarginPct =
    contractedRateNum > 0 && grossProfit !== null
      ? ((grossProfit / contractedRateNum) * 100).toFixed(1)
      : null

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (dispatchType === "carrier") {
      if (!carrierId) {
        toast.error("Please select an outside carrier.")
        return
      }
      if (!carrierRate || carrierRateNum <= 0) {
        toast.error("Please enter the agreed carrier buy rate.")
        return
      }
    } else {
      if (!driverId) {
        toast.error("Please select an active company driver.")
        return
      }
      if (!truckId) {
        toast.error("Please assign a power unit (tractor).")
        return
      }
    }

    setLoading(true)
    try {
      const res = await dispatchLoadAction({
        loadId,
        carrierId: dispatchType === "carrier" ? carrierId : null,
        carrierRate: dispatchType === "carrier" ? carrierRate.trim() || null : null,
        driverId: dispatchType === "fleet" ? driverId : null,
        truckId: dispatchType === "fleet" ? truckId : null,
        trailerId: dispatchType === "fleet" ? (trailerId || null) : null,
        totalMiles: totalMiles.trim() || null,
      })

      if (res.ok) {
        toast.success(
          dispatchType === "carrier"
            ? `Load ${loadNumber} brokered & dispatched to outside carrier!`
            : `Load ${loadNumber} dispatched! Trip ${res.tripNumber} initiated.`
        )
        setOpen(false)
      } else {
        toast.error(res.error || "Failed to dispatch load")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch load")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-hover transition-colors shadow-xs">
          <Send className="h-3.5 w-3.5" />
          Dispatch Load
        </span>
      </ModalTrigger>

      <ModalBody className="max-w-3xl">
        <form onSubmit={handleDispatch} className="flex flex-col flex-1 overflow-hidden">
          {/* ─── Top Studio Header ─── */}
          <div className="px-6 py-6 border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec] dark:bg-zinc-900/60 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 size-36 rounded-full bg-[#d9622b]/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a8b8f]">
                DISPATCH COCKPIT · {loadNumber}
              </span>
            </div>

            <h2 className="font-serif text-[28px] leading-tight font-normal text-[#16181d] dark:text-zinc-100">
              Assign & Dispatch <span className="italic text-[#d9622b]">Freight</span>
            </h2>

            {/* Context chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
              {laneSummary && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-[#d1ccc5] dark:border-zinc-800 text-[#16181d] dark:text-zinc-200 shadow-xs">
                  <MapPin className="size-3 text-[#d9622b]" />
                  <span>{laneSummary}</span>
                </div>
              )}
              {equipmentRequirement && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff0e6] dark:bg-orange-950/30 text-[#d9622b] border border-[#d9622b]/30 font-medium">
                  <Truck className="size-3" />
                  <span>{equipmentRequirement}</span>
                </div>
              )}
              {contractedRateNum > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold ml-auto">
                  Shipper Rate: ${contractedRateNum.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* ─── Mode Switcher (Kokonut Gliding Pill) ─── */}
          <div className="px-6 pt-5 pb-2">
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#eee9df] dark:bg-zinc-900 border border-[#d1ccc5]/60 dark:border-zinc-800 text-xs font-medium relative">
              <button
                type="button"
                onClick={() => setDispatchType("fleet")}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all z-10 cursor-pointer",
                  dispatchType === "fleet"
                    ? "text-[#16181d] font-semibold"
                    : "text-[#73757a] hover:text-[#16181d]"
                )}
              >
                {dispatchType === "fleet" && (
                  <motion.div
                    layoutId="dispatch-modal-tab"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-zinc-800 shadow-xs border border-[#d1ccc5]/60 dark:border-zinc-700"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Truck className="size-3.5 relative z-10" />
                <span className="relative z-10">Company Fleet Roster</span>
              </button>

              <button
                type="button"
                onClick={() => setDispatchType("carrier")}
                className={cn(
                  "relative flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all z-10 cursor-pointer",
                  dispatchType === "carrier"
                    ? "text-[#16181d] font-semibold"
                    : "text-[#73757a] hover:text-[#16181d]"
                )}
              >
                {dispatchType === "carrier" && (
                  <motion.div
                    layoutId="dispatch-modal-tab"
                    className="absolute inset-0 rounded-xl bg-white dark:bg-zinc-800 shadow-xs border border-[#d1ccc5]/60 dark:border-zinc-700"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Building2 className="size-3.5 relative z-10" />
                <span className="relative z-10">Outside Carrier (Brokered)</span>
              </button>
            </div>
          </div>

          {/* ─── Modal Content Body ─── */}
          <ModalContent className="space-y-6 pt-4 pb-6">
            <AnimatePresence mode="wait">
              {dispatchType === "fleet" ? (
                <motion.div
                  key="fleet-view"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* 1. Dedicated Driver Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                        1. Assign Dedicated Driver *
                      </span>
                      <Link
                        href="/drivers"
                        className="font-mono text-[11px] text-[#d9622b] hover:underline flex items-center gap-1"
                      >
                        <Plus className="size-3" />
                        Manage Roster
                      </Link>
                    </div>

                    {availableDrivers.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/70 text-xs text-amber-900 space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                          <span>No drivers available in fleet roster</span>
                        </div>
                        <p className="text-amber-800 text-[12px] leading-relaxed">
                          Add a driver asset or link a workspace member before dispatching.
                        </p>
                        <Link
                          href="/drivers"
                          className="inline-flex items-center gap-1 font-semibold text-xs text-[#d9622b] hover:underline pt-1"
                        >
                          + Go to Drivers section
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                        {availableDrivers.map((d) => {
                          const isSelected = driverId === d.id
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setDriverId(d.id)}
                              className={cn(
                                "flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer",
                                isSelected
                                  ? "border-[#d9622b] bg-[#fff0e6] shadow-[0_2px_12px_rgba(217,98,43,0.12)] ring-1 ring-[#d9622b]"
                                  : "border-[#d1ccc5] bg-white hover:border-[#b8b1a7] hover:bg-[#fffefb]"
                              )}
                            >
                              <div
                                className={cn(
                                  "size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                                  isSelected
                                    ? "bg-[#d9622b] text-white"
                                    : "bg-[#eee9df] text-[#16181d]"
                                )}
                              >
                                {d.firstName[0]}
                                {d.lastName[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-[14px] font-semibold text-[#16181d] truncate">
                                    {d.firstName} {d.lastName}
                                  </p>
                                  {isSelected && (
                                    <CheckCircle2 className="size-4 text-[#d9622b] shrink-0" />
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-block size-2 rounded-full",
                                      d.status === "available" ? "bg-emerald-500" : "bg-amber-500"
                                    )}
                                  />
                                  <span className="text-[11px] font-medium text-[#73757a] capitalize">
                                    {d.status}
                                  </span>
                                  {d.cdlExpiration && (
                                    <span className="text-[10px] font-mono text-[#8a8b8f] ml-auto">
                                      CDL OK
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Tractor Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                        2. Assign Tractor Power Unit *
                      </span>
                      <Link
                        href="/fleet"
                        className="font-mono text-[11px] text-[#d9622b] hover:underline flex items-center gap-1"
                      >
                        <Plus className="size-3" />
                        Fleet Trucks
                      </Link>
                    </div>

                    {availableTrucks.length === 0 ? (
                      <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        No trucks configured in fleet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                        {availableTrucks.map((t) => {
                          const isSelected = truckId === t.id
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setTruckId(t.id)}
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
                                  <p className="text-[14px] font-bold font-mono text-[#16181d]">
                                    Unit {t.unitNumber}
                                  </p>
                                  {isSelected && (
                                    <CheckCircle2 className="size-4 text-[#d9622b] shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] text-[#73757a] truncate mt-0.5">
                                  {t.make} {t.model} {t.currentLocation ? `· ${t.currentLocation}` : ""}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Trailer Selection */}
                  <div className="space-y-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block">
                      3. Assigned Trailer (Optional)
                    </span>
                    <select
                      value={trailerId}
                      onChange={(e) => setTrailerId(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 text-[14px] text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
                    >
                      <option value="">No trailer attached / Bobtail / Shipper Trailer</option>
                      {availableTrailers.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          Trailer {tr.unitNumber} {tr.type ? `(${tr.type})` : ""} — {tr.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="carrier-view"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Carrier Directory Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                        Select Contracted Outside Carrier *
                      </span>
                      <Link
                        href="/carrier-pay"
                        className="font-mono text-[11px] text-[#d9622b] hover:underline flex items-center gap-1"
                      >
                        <Plus className="size-3" />
                        Manage Carriers
                      </Link>
                    </div>

                    {availableCarriers.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/70 text-xs text-amber-900 space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                          <span>No outside carriers in directory</span>
                        </div>
                        <p className="text-amber-800 text-[12px] leading-relaxed">
                          Add outside carrier partners in Carrier Pay to broker loads and generate rate confirmations.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto p-0.5">
                        {availableCarriers.map((c) => {
                          const isSelected = carrierId === c.id
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCarrierId(c.id)}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border text-left transition-all w-full cursor-pointer",
                                isSelected
                                  ? "border-[#d9622b] bg-[#fff0e6] shadow-[0_2px_12px_rgba(217,98,43,0.12)] ring-1 ring-[#d9622b]"
                                  : "border-[#d1ccc5] bg-white hover:border-[#b8b1a7] hover:bg-[#fffefb]"
                              )}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={cn(
                                    "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                    isSelected
                                      ? "bg-[#d9622b] text-white"
                                      : "bg-[#eee9df] text-[#16181d]"
                                  )}
                                >
                                  <Building2 className="size-5" />
                                </div>
                                <div>
                                  <p className="text-[15px] font-semibold text-[#16181d]">
                                    {c.name}
                                  </p>
                                  <p className="font-mono text-[11px] text-[#73757a]">
                                    {c.mcNumber ? `MC #${c.mcNumber}` : ""} {c.dotNumber ? `· DOT ${c.dotNumber}` : ""}
                                  </p>
                                </div>
                              </div>
                              {isSelected ? (
                                <span className="size-6 rounded-full bg-[#d9622b] text-white flex items-center justify-center">
                                  <Check className="size-3.5" strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="size-6 rounded-full border border-[#d1ccc5] bg-white" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* ─── Financial Spread & Margin Cockpit ─── */}
                  <div className="rounded-2xl border border-[#d1ccc5] bg-white p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#e4ddd3] pb-3">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f]">
                        FINANCIAL SPREAD & BROKERAGE MARGIN
                      </span>
                      <ShieldCheck className="size-4 text-emerald-600" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="p-3.5 rounded-xl bg-[#f7f3ec] border border-[#e4ddd3] space-y-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#8a8b8f] block">
                          Shipper Contracted
                        </span>
                        <div className="font-mono text-xl font-bold text-[#16181d]">
                          ${contractedRateNum.toFixed(2)}
                        </div>
                        <span className="text-[11px] text-[#73757a]">
                          Invoice rate locked
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-[#d1ccc5] space-y-1 focus-within:border-[#d9622b] focus-within:ring-2 focus-within:ring-[#d9622b]/20 transition-all">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#8a8b8f] block">
                          Carrier Buy Rate *
                        </span>
                        <div className="flex items-center">
                          <span className="font-mono text-lg font-bold text-[#16181d] mr-1">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={carrierRate}
                            onChange={(e) => setCarrierRate(e.target.value)}
                            placeholder="2200.00"
                            className="font-mono text-xl font-bold text-[#16181d] w-full bg-transparent outline-none"
                            required
                          />
                        </div>
                        <span className="text-[11px] text-[#73757a]">
                          Payable to outside carrier
                        </span>
                      </div>
                    </div>

                    {/* Live Margin Calculation Rail */}
                    {grossProfit !== null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-colors",
                          grossProfit >= 0
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-rose-50 border-rose-200 text-rose-900"
                        )}
                      >
                        <div className="flex items-center gap-2 font-sans font-medium text-[13px]">
                          <TrendingUp className="size-4 shrink-0" />
                          <span>
                            {grossProfit >= 0 ? "Projected Gross Margin" : "Negative Margin Warning"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold block">
                            {grossProfit >= 0 ? "+" : ""}${grossProfit.toFixed(2)}
                          </span>
                          <span className="text-[11px] opacity-80">
                            {grossMarginPct}% gross spread
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Estimated Route Miles */}
            <div className="pt-1">
              <label className="font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8a8b8f] block mb-1.5">
                Total Estimated Route Miles{" "}
                <span className="text-[#a8a29a] normal-case tracking-normal">— Optional</span>
              </label>
              <input
                type="number"
                value={totalMiles}
                onChange={(e) => setTotalMiles(e.target.value)}
                placeholder="e.g. 780"
                className="h-11 w-full rounded-2xl border border-[#d1ccc5] bg-white px-3.5 font-mono text-sm text-[#16181d] focus:border-[#d9622b] focus:outline-none transition-colors shadow-xs"
              />
            </div>
          </ModalContent>

          {/* ─── Modal Footer Navigation ─── */}
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
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#d9622b] px-8 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Dispatching Trip...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Dispatch Load</span>
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
