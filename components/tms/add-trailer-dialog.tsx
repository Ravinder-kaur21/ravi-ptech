"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Plus, Box, ArrowRight, Loader2, Thermometer, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/animated-modal"
import { cn } from "@/lib/utils"
import { createTrailerAction } from "@/app/actions/tms"

const TRAILER_TYPES = [
  { label: "Dry Van (53')", id: "Dry Van (53')" },
  { label: "Reefer (53')", id: "Reefer (53')" },
  { label: "Flatbed (48')", id: "Flatbed (48')" },
  { label: "Step Deck", id: "Step Deck" },
]

const TRAILER_MAKES = ["Great Dane", "Utility", "Wabash", "Vanguard", "Hyundai Translead"]

export function AddTrailerDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const [unitNumber, setUnitNumber] = React.useState("")
  const [type, setType] = React.useState("Dry Van (53')")
  const [make, setMake] = React.useState("Great Dane")
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [vin, setVin] = React.useState("")
  const [licensePlate, setLicensePlate] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitNumber.trim()) {
      toast.error("Trailer unit number is required.")
      return
    }

    setLoading(true)
    try {
      const res = await createTrailerAction({
        unitNumber: unitNumber.trim(),
        type,
        make: make.trim() || null,
        year: year.trim() || null,
        vin: vin.trim() || null,
        licensePlate: licensePlate.trim() || null,
        status: "available",
      })

      if (res.ok) {
        toast.success(`Trailer Unit #${res.unitNumber} added to fleet!`)
        setOpen(false)
        setUnitNumber("")
        setVin("")
        setLicensePlate("")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to add trailer")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register trailer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full border border-brand-rule px-4 text-xs font-medium text-brand-ink hover:bg-brand-cream-soft transition-colors shadow-2xs cursor-pointer">
          <Plus className="h-3.5 w-3.5 text-[#d9622b]" />
          Add Trailer
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
                FLEET ASSET · TRAILER ONBOARDING
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#16181d] dark:text-zinc-100">
              Register <span className="italic text-[#d9622b]">Trailer</span>
            </h2>
          </div>

          {/* Form Body */}
          <div className="px-5 py-4 space-y-3.5 max-h-[52vh] overflow-y-auto">
            {/* Trailer Type Selector */}
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block">
                Equipment Classification
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {TRAILER_TYPES.map((t) => {
                  const isSelected = type === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={cn(
                        "py-2 px-3 rounded-xl text-left border transition-all text-xs cursor-pointer",
                        isSelected
                          ? "border-[#d9622b] bg-[#fff0e6] dark:bg-orange-950/30 text-[#d9622b] font-semibold ring-1 ring-[#d9622b]"
                          : "border-[#e4ddd3] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[#55575b] hover:border-[#b8b1a7]"
                      )}
                    >
                      <div className="font-semibold">{t.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Unit # & Year */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  Trailer Unit # *
                </label>
                <input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. TLR-5301"
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

            {/* Manufacturer Make */}
            <div>
              <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                Manufacturer / Make
              </label>
              <select
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
              >
                {TRAILER_MAKES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* VIN & Plate */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block mb-1">
                  VIN (Serial #)
                </label>
                <input
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="1GRAA062..."
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
                  placeholder="TX-TR882"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 font-mono text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>
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
                  <span>Adding Trailer...</span>
                </>
              ) : (
                <>
                  <span>Add Trailer to Fleet</span>
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
