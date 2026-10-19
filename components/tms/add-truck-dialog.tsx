"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Plus, Truck, ArrowRight, Loader2, Fuel, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/animated-modal"
import { cn } from "@/lib/utils"
import { createTruckAction } from "@/app/actions/tms"

const POPULAR_MAKES = [
  { make: "Freightliner", model: "Cascadia" },
  { make: "Peterbilt", model: "579" },
  { make: "Kenworth", model: "T680" },
  { make: "Volvo", model: "VNL 860" },
]

export function AddTruckDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const [unitNumber, setUnitNumber] = React.useState("")
  const [make, setMake] = React.useState("Freightliner")
  const [model, setModel] = React.useState("Cascadia")
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [vin, setVin] = React.useState("")
  const [licensePlate, setLicensePlate] = React.useState("")
  const [currentLocation, setCurrentLocation] = React.useState("")
  const [currentMiles, setCurrentMiles] = React.useState("")
  const [fuelType, setFuelType] = React.useState("Diesel")
  const [showOptional, setShowOptional] = React.useState(false)

  const handleSelectPreset = (p: typeof POPULAR_MAKES[0]) => {
    setMake(p.make)
    setModel(p.model)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitNumber.trim()) {
      toast.error("Tractor unit number is required.")
      return
    }

    setLoading(true)
    try {
      const res = await createTruckAction({
        unitNumber: unitNumber.trim(),
        make: make.trim() || null,
        model: model.trim() || null,
        year: year.trim() || null,
        vin: vin.trim() || null,
        licensePlate: licensePlate.trim() || null,
        currentLocation: currentLocation.trim() || null,
        currentMiles: currentMiles.trim() || null,
        fuelType,
        status: "available",
      })

      if (res.ok) {
        toast.success(`Tractor Unit #${res.unitNumber} registered in fleet!`)
        setOpen(false)
        setUnitNumber("")
        setVin("")
        setLicensePlate("")
        setCurrentLocation("")
        setCurrentMiles("")
        setShowOptional(false)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to add tractor")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register tractor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-hover transition-colors shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          Add Tractor
        </span>
      </ModalTrigger>

      {/* ─── Compact Modal Body (max-w-[460px]) ─── */}
      <ModalBody className="max-w-[460px] overflow-hidden p-0 border border-[#d1ccc5] dark:border-zinc-800 shadow-2xl rounded-3xl bg-[#fdfbf7] dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/40 relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8b8f]">
                FLEET ASSET · POWER UNIT ONBOARDING
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#16181d] dark:text-zinc-100">
              Register <span className="italic text-[#d9622b]">Tractor</span>
            </h2>
          </div>

          {/* Form Body */}
          <div className="px-5 py-4 space-y-3.5 max-h-[52vh] overflow-y-auto">
            {/* Quick Equipment Presets */}
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block">
                Popular Power Units
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {POPULAR_MAKES.map((p) => {
                  const isSelected = make === p.make && model === p.model
                  return (
                    <button
                      key={p.make}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={cn(
                        "py-1.5 px-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer",
                        isSelected
                          ? "border-[#d9622b] bg-[#fff0e6] dark:bg-orange-950/30 text-[#d9622b] font-semibold ring-1 ring-[#d9622b]"
                          : "border-[#e4ddd3] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#55575b] hover:border-[#b8b1a7]"
                      )}
                    >
                      <div className="truncate font-semibold">{p.make}</div>
                      <div className="text-[10px] text-[#8a8b8f] truncate">{p.model}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Unit # & Year */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  Tractor Unit # *
                </label>
                <input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. TRK-104"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 font-mono text-xs font-bold text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  Model Year
                </label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2025"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>
            </div>

            {/* Custom Make & Model if needed */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  Make
                </label>
                <input
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  Model
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>
            </div>

            {/* VIN & Plate */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  VIN (17 chars)
                </label>
                <input
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="1FUJGLDR9..."
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  License Plate #
                </label>
                <input
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="TX-9402"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>
            </div>

            {/* Fuel Type Pills */}
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block">
                Fuel Specification
              </span>
              <div className="flex gap-1.5">
                {["Diesel", "DEF Equipped", "CNG / LNG", "Electric"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFuelType(f)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      fuelType === f
                        ? "border-[#d9622b] bg-[#fff0e6] dark:bg-orange-950/30 text-[#d9622b]"
                        : "border-[#e4ddd3] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#73757a]"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Mileage & Yard Location Accordion */}
            <div className="border border-[#e4ddd3] dark:border-zinc-800 rounded-xl overflow-hidden bg-[#f7f3ec]/30 dark:bg-zinc-900/20">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#73757a] hover:text-[#16181d] transition-colors cursor-pointer"
              >
                <span>Current Odometer & Terminal Location (Optional)</span>
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
                      <input
                        value={currentMiles}
                        onChange={(e) => setCurrentMiles(e.target.value)}
                        placeholder="e.g. 142,500 miles"
                        className="h-8 rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-[#16181d]"
                      />
                      <input
                        value={currentLocation}
                        onChange={(e) => setCurrentLocation(e.target.value)}
                        placeholder="e.g. Dallas Terminal Yard"
                        className="h-8 rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-[#16181d]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
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
              disabled={loading || !unitNumber.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#d9622b] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Adding Tractor...</span>
                </>
              ) : (
                <>
                  <span>Add Tractor to Fleet</span>
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
