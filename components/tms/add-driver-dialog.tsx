"use client"

import * as React from "react"
import { Plus, User, Loader2 } from "lucide-react"
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
import { createDriverAction } from "@/app/actions/tms"

export function AddDriverDialog() {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [cdlNumber, setCdlNumber] = React.useState("")
  const [cdlState, setCdlState] = React.useState("TX")
  const [payType, setPayType] = React.useState("Per Mile")
  const [payRate, setPayRate] = React.useState("0.65")
  const [status, setStatus] = React.useState<"active" | "inactive" | "on_leave">("active")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required")
      return
    }

    setLoading(true)
    try {
      const res = await createDriverAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        cdlNumber: cdlNumber.trim() || null,
        cdlState: cdlState.trim() || null,
        payType,
        payRate: payRate.trim() || null,
        status,
      })

      if (res.ok) {
        toast.success(`Driver ${res.name} added successfully`)
        setOpen(false)
        setFirstName("")
        setLastName("")
        setPhone("")
        setEmail("")
        setCdlNumber("")
      } else {
        toast.error(res.error || "Failed to add driver")
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
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
        Add driver
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-brand-card border-brand-rule">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
                <User className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-brand-ink">
                Add Professional Driver
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-brand-muted-soft">
              Register a commercial driver for dispatch assignments, hours of service compliance, and payroll.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-medium text-brand-ink">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Marcus"
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-medium text-brand-ink">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Vance"
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-brand-ink">
                  Cell Phone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (214) 555-0192"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-brand-ink">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marcus@freight.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cdlNumber" className="text-xs font-medium text-brand-ink">
                  CDL License #
                </Label>
                <Input
                  id="cdlNumber"
                  value={cdlNumber}
                  onChange={(e) => setCdlNumber(e.target.value)}
                  placeholder="DL-8932014"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cdlState" className="text-xs font-medium text-brand-ink">
                  CDL State
                </Label>
                <Input
                  id="cdlState"
                  value={cdlState}
                  onChange={(e) => setCdlState(e.target.value.toUpperCase())}
                  placeholder="TX"
                  maxLength={2}
                  className="text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payType" className="text-xs font-medium text-brand-ink">
                  Compensation Model
                </Label>
                <NativeSelect
                  id="payType"
                  value={payType}
                  onChange={(e) => setPayType(e.target.value)}
                  className="text-xs"
                >
                  <NativeSelectOption value="Per Mile">Per Mile (CPM)</NativeSelectOption>
                  <NativeSelectOption value="Percentage">Percentage of Gross</NativeSelectOption>
                  <NativeSelectOption value="Hourly">Hourly Rate</NativeSelectOption>
                  <NativeSelectOption value="Flat Pay">Flat Rate per Load</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payRate" className="text-xs font-medium text-brand-ink">
                  Pay Rate ($ or %)
                </Label>
                <Input
                  id="payRate"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  placeholder="0.65"
                  className="text-xs font-mono"
                />
              </div>
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
              Save Driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
