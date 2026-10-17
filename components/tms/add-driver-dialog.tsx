"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, User, UserCheck, ShieldAlert, Phone, Mail, Award, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { getSubdivisions } from "@/lib/geography"
import { createDriverAction } from "@/app/actions/tms"

interface WorkspaceMember {
  userId: string
  name: string
  email: string
  role: string
}

export function AddDriverDialog({
  workspaceMembers = [],
}: {
  workspaceMembers?: WorkspaceMember[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  // Link to existing member state
  const [selectedMemberId, setSelectedMemberId] = React.useState("")

  // Driver profile fields
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
  const [status, setStatus] = React.useState<"active" | "inactive" | "on_leave">("active")

  // Dynamic US & Canada subdivisions
  const usStates = React.useMemo(() => getSubdivisions("US"), [])

  // Auto-fill when a workspace member is selected
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required")
      return
    }

    setLoading(true)
    try {
      const res = await createDriverAction({
        userId: selectedMemberId || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        cdlNumber: cdlNumber.trim() || null,
        cdlState: cdlState.trim() || null,
        cdlExpiration: cdlExpiration ? cdlExpiration : null,
        emergencyContact: emergencyContact.trim() || null,
        emergencyPhone: emergencyPhone.trim() || null,
        payType,
        payRate: payRate.trim() || null,
        status,
      })

      if (res.ok) {
        toast.success(`Driver ${res.name} registered successfully`)
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
        router.refresh()
      } else {
        toast.error(res.error || "Failed to add driver")
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const isExpiringSoon =
    cdlExpiration &&
    new Date(cdlExpiration) < new Date(Date.now() + 30 * 86400000)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Driver
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Register Professional Driver</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a fleet asset driver, or link to an invited workspace team member.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Member Bridge Selector */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="link-member" className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                Link to Workspace Member (Optional)
              </Label>
              <span className="text-[11px] text-muted-foreground">Enables driver mobile app login</span>
            </div>
            <NativeSelect
              id="link-member"
              value={selectedMemberId}
              onChange={(e) => handleMemberSelect(e.target.value)}
              className="h-9 text-xs"
            >
              <NativeSelectOption value="">
                Fleet Driver Only (No login account linked)
              </NativeSelectOption>
              {workspaceMembers.map((m) => (
                <NativeSelectOption key={m.userId} value={m.userId}>
                  {m.name || "Unnamed"} ({m.email}) — Role: {m.role}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {selectedMemberId && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Driver profile will be linked to workspace user account.
              </p>
            )}
          </div>

          {/* Personal & Contact Details */}
          <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Identity & Contact
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first-name" className="text-xs font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first-name"
                  placeholder="e.g. Marcus"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last-name" className="text-xs font-medium">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last-name"
                  placeholder="e.g. Vance"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="driver-phone" className="text-xs font-medium">
                  Direct Phone / Cell
                </Label>
                <Input
                  id="driver-phone"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driver-email" className="text-xs font-medium">
                  Email Address
                </Label>
                <Input
                  id="driver-email"
                  type="email"
                  placeholder="driver@transport.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Commercial Driver License (CDL) Compliance */}
          <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Award className="h-3.5 w-3.5 text-primary" />
              Commercial Driver's License (CDL)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="cdl-number" className="text-xs font-medium">
                  CDL License #
                </Label>
                <Input
                  id="cdl-number"
                  placeholder="DL-8932014"
                  value={cdlNumber}
                  onChange={(e) => setCdlNumber(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="cdl-state" className="text-xs font-medium">
                  Issuing State / Jurisdiction
                </Label>
                <NativeSelect
                  id="cdl-state"
                  value={cdlState}
                  onChange={(e) => setCdlState(e.target.value)}
                  className="h-9 text-sm"
                >
                  {usStates.map((s) => (
                    <NativeSelectOption key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="cdl-expiration" className="text-xs font-medium">
                  License Expiration
                </Label>
                <Input
                  id="cdl-expiration"
                  type="date"
                  value={cdlExpiration}
                  onChange={(e) => setCdlExpiration(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {isExpiringSoon && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Notice: CDL expiration date is within 30 days or already past.</span>
              </div>
            )}
          </div>

          {/* Payroll Compensation & Status */}
          <div className="space-y-3 p-3.5 rounded-lg border bg-muted/20">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Payroll Compensation & Duty Status
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-type" className="text-xs font-medium">
                  Pay Model
                </Label>
                <NativeSelect
                  id="pay-type"
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="h-9 text-sm"
                >
                  <NativeSelectOption value="Per Mile">Per Mile (CPM)</NativeSelectOption>
                  <NativeSelectOption value="Percentage">Percentage of Gross</NativeSelectOption>
                  <NativeSelectOption value="Hourly">Hourly Rate</NativeSelectOption>
                  <NativeSelectOption value="Flat Pay">Flat Rate per Load</NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-rate" className="text-xs font-medium">
                  Rate ($ or %)
                </Label>
                <Input
                  id="pay-rate"
                  placeholder="0.65"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="driver-status" className="text-xs font-medium">
                  Dispatch Status
                </Label>
                <NativeSelect
                  id="driver-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="h-9 text-sm"
                >
                  <NativeSelectOption value="active">Active & Available</NativeSelectOption>
                  <NativeSelectOption value="inactive">Inactive</NativeSelectOption>
                  <NativeSelectOption value="on_leave">On Leave / Rest Cycle</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg border bg-muted/20">
            <div className="space-y-1.5">
              <Label htmlFor="emergency-contact" className="text-xs font-medium">
                Emergency Contact Name
              </Label>
              <Input
                id="emergency-contact"
                placeholder="e.g. Sarah Vance (Spouse)"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergency-phone" className="text-xs font-medium">
                Emergency Contact Phone
              </Label>
              <Input
                id="emergency-phone"
                placeholder="(555) 999-1122"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Spinner className="h-4 w-4 mr-2" />}
              Save Driver
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
