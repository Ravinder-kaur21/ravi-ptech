"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  Plus,
  User,
  UserCheck,
  ShieldAlert,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Loader2,
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
import { getSubdivisions } from "@/lib/geography"
import { cn } from "@/lib/utils"
import { createDriverAction } from "@/app/actions/tms"

interface WorkspaceMember {
  userId: string
  name: string
  email: string
  role: string
}

const PAY_PRESETS = [
  { label: "$0.60/mi", type: "Per Mile", rate: "0.60" },
  { label: "$0.70/mi", type: "Per Mile", rate: "0.70" },
  { label: "25% Gross", type: "Percentage", rate: "25" },
  { label: "$32/hr", type: "Hourly", rate: "32" },
]

export function AddDriverDialog({
  workspaceMembers = [],
}: {
  workspaceMembers?: WorkspaceMember[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  // Mode: "quick" (manual profile) or "member" (link existing user)
  const [mode, setMode] = React.useState<"quick" | "member">(
    workspaceMembers.length > 0 ? "member" : "quick"
  )
  const [selectedMemberId, setSelectedMemberId] = React.useState("")

  // Driver fields
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [cdlNumber, setCdlNumber] = React.useState("")
  const [cdlState, setCdlState] = React.useState("TX")
  const [cdlExpiration, setCdlExpiration] = React.useState("")
  const [payType, setPayType] = React.useState("Per Mile")
  const [payRate, setPayRate] = React.useState("0.65")
  const [emergencyContact, setEmergencyContact] = React.useState("")
  const [emergencyPhone, setEmergencyPhone] = React.useState("")
  const [showOptional, setShowOptional] = React.useState(false)

  const usStates = React.useMemo(() => getSubdivisions("US"), [])

  const handleMemberSelect = (userId: string) => {
    setSelectedMemberId(userId)
    if (!userId) return

    const mem = workspaceMembers.find((m) => m.userId === userId)
    if (mem) {
      const parts = mem.name ? mem.name.trim().split(" ") : ["", ""]
      setFirstName(parts[0] || "")
      setLastName(parts.slice(1).join(" ") || "")
      setEmail(mem.email || "")
    }
  }

  const handleApplyPreset = (preset: typeof PAY_PRESETS[0]) => {
    setPayType(preset.type)
    setPayRate(preset.rate)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required.")
      return
    }

    setLoading(true)
    try {
      const res = await createDriverAction({
        userId: mode === "member" && selectedMemberId ? selectedMemberId : null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        cdlNumber: cdlNumber.trim() || null,
        cdlState: cdlState.trim() || null,
        cdlExpiration: cdlExpiration || null,
        emergencyContact: emergencyContact.trim() || null,
        emergencyPhone: emergencyPhone.trim() || null,
        payType,
        payRate: payRate.trim() || null,
        status: "active",
      })

      if (res.ok) {
        toast.success(`Driver ${res.name} onboarded successfully!`)
        setOpen(false)
        setSelectedMemberId("")
        setFirstName("")
        setLastName("")
        setPhone("")
        setEmail("")
        setCdlNumber("")
        setCdlExpiration("")
        setEmergencyContact("")
        setEmergencyPhone("")
        setShowOptional(false)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to add driver")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register driver")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} setOpen={setOpen}>
      <ModalTrigger>
        <span className="inline-flex items-center gap-1.5 h-9 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-hover transition-colors shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          Add Driver
        </span>
      </ModalTrigger>

      {/* ─── Compact Aceternity-Inspired Modal Body (max-w-[480px]) ─── */}
      <ModalBody className="max-w-[480px] overflow-hidden p-0 border border-[#d1ccc5] dark:border-zinc-800 shadow-2xl rounded-3xl bg-[#fdfbf7] dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec]/80 dark:bg-zinc-900/40 relative">
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-[#d9622b] animate-pulse" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a8b8f]">
                FLEET ROSTER · DRIVER ONBOARDING
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-[#16181d] dark:text-zinc-100">
              Register <span className="italic text-[#d9622b]">Driver</span>
            </h2>
          </div>

          {/* Kokonut Segmented Pill Switcher */}
          {workspaceMembers.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#eee9df] dark:bg-zinc-800/80 border border-[#e4ddd3] dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setMode("member")}
                  className={cn(
                    "py-1.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    mode === "member"
                      ? "bg-white dark:bg-zinc-900 text-[#16181d] dark:text-zinc-100 shadow-xs font-semibold"
                      : "text-[#73757a] hover:text-[#16181d]"
                  )}
                >
                  <UserCheck className="size-3.5 text-[#d9622b]" />
                  <span>Link Team Member</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("quick")
                    setSelectedMemberId("")
                  }}
                  className={cn(
                    "py-1.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    mode === "quick"
                      ? "bg-white dark:bg-zinc-900 text-[#16181d] dark:text-zinc-100 shadow-xs font-semibold"
                      : "text-[#73757a] hover:text-[#16181d]"
                  )}
                >
                  <User className="size-3.5" />
                  <span>Fleet Driver Record</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Scroll Body */}
          <div className="px-5 py-3 space-y-3.5 max-h-[52vh] overflow-y-auto">
            {/* Member Bridge Dropdown if mode is member */}
            {mode === "member" && workspaceMembers.length > 0 && (
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 space-y-1.5">
                <label className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f] block">
                  Select Invited Team Member
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2.5 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                >
                  <option value="">Select team member to link...</option>
                  {workspaceMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name || "Unnamed"} ({m.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#73757a] flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  <span>Enables mobile driver app logins and route assignment.</span>
                </p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block mb-1">
                  First Name *
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Marcus"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block mb-1">
                  Last Name *
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Vance"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block mb-1">
                  Phone (SMS Dispatch)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. (555) 234-5678"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase font-semibold tracking-wider text-[#8a8b8f] block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@fleet.com"
                  className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* CDL License & State */}
            <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Award className="size-3.5 text-[#d9622b]" />
                <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">
                  Commercial Driver License (CDL)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    value={cdlNumber}
                    onChange={(e) => setCdlNumber(e.target.value)}
                    placeholder="CDL License #"
                    className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2.5 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                  />
                </div>

                <div>
                  <select
                    value={cdlState}
                    onChange={(e) => setCdlState(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2 text-xs font-mono text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                  >
                    {usStates.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase text-[#8a8b8f] block mb-0.5">
                  CDL Expiration Date
                </label>
                <input
                  type="date"
                  value={cdlExpiration}
                  onChange={(e) => setCdlExpiration(e.target.value)}
                  className="h-8 w-full rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2 text-xs text-[#16181d] dark:text-zinc-100 focus:border-[#d9622b] focus:outline-none"
                />
              </div>
            </div>

            {/* Pay Agreement */}
            <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-semibold text-[#8a8b8f]">
                  Settlement & Pay Rate
                </span>
                <span className="font-mono text-xs font-bold text-[#d9622b]">
                  {payType === "Percentage" ? `${payRate}%` : `$${payRate} / ${payType}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="h-9 rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-2.5 text-xs text-[#16181d] dark:text-zinc-100"
                >
                  <option value="Per Mile">Per Mile ($/mi)</option>
                  <option value="Percentage">Percentage of Gross (%)</option>
                  <option value="Hourly">Hourly ($/hr)</option>
                  <option value="Flat Pay">Flat per Trip ($)</option>
                </select>

                <input
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  placeholder="0.65"
                  className="h-9 rounded-xl border border-[#d1ccc5] dark:border-zinc-700 bg-[#fdfbf7] dark:bg-zinc-950 px-3 font-mono text-xs font-bold text-[#16181d] dark:text-zinc-100"
                />
              </div>

              {/* Quick rate chips */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {PAY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-[#e4ddd3] dark:border-zinc-700 bg-[#f7f3ec] dark:bg-zinc-800 text-[#55575b] hover:border-[#d9622b] hover:text-[#d9622b] transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Contact Accordion */}
            <div className="border border-[#e4ddd3] dark:border-zinc-800 rounded-xl overflow-hidden bg-[#f7f3ec]/30 dark:bg-zinc-900/20">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#73757a] hover:text-[#16181d] transition-colors cursor-pointer"
              >
                <span>In Case of Emergency (ICE) Details</span>
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
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="Emergency Contact Name"
                        className="h-8 rounded-lg border border-[#d1ccc5] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-xs text-[#16181d]"
                      />
                      <input
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="Emergency Phone #"
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
              disabled={loading || !firstName.trim() || !lastName.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#d9622b] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#c4531f] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Registering Driver...</span>
                </>
              ) : (
                <>
                  <span>Complete Driver Registration</span>
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
