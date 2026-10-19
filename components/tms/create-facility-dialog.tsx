"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MapPin, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { getAllCountries, getSubdivisions } from "@/lib/geography"
import { createFacilityAction } from "@/app/actions/tms-customers"

const FACILITY_TYPES = [
  { value: "shipper_receiver", label: "Shipper & Receiver (Dual)" },
  { value: "shipper", label: "Shipper (Pickup Only)" },
  { value: "receiver", label: "Receiver (Delivery Only)" },
  { value: "terminal", label: "Carrier Fleet Terminal" },
  { value: "cross_dock", label: "Cross-Dock Facility" },
  { value: "yard", label: "Trailer Drop Yard" },
]

export function CreateFacilityDialog({
  onFacilityCreated,
}: {
  onFacilityCreated?: (fac: { id: string; name: string; city: string; state: string }) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const allCountries = React.useMemo(() => getAllCountries(), [])

  const [name, setName] = React.useState("")
  const [facilityType, setFacilityType] = React.useState("shipper_receiver")
  const [address, setAddress] = React.useState("")
  const [country, setCountry] = React.useState("US")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [zip, setZip] = React.useState("")
  const [contactName, setContactName] = React.useState("")
  const [contactPhone, setContactPhone] = React.useState("")
  const [operatingHours, setOperatingHours] = React.useState("07:00 - 15:30 M-F")
  const [appointmentRequired, setAppointmentRequired] = React.useState(true)
  const [checkInInstructions, setCheckInInstructions] = React.useState("")

  const subdivisions = React.useMemo(
    () => getSubdivisions(country),
    [country]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      toast.error("Please fill in facility name, address, city, and state")
      return
    }

    startTransition(async () => {
      const res = await createFacilityAction({
        name: name.trim(),
        facilityType,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country,
        zip: zip.trim() || null,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        operatingHours: operatingHours.trim() || null,
        appointmentRequired,
        checkInInstructions: checkInInstructions.trim() || null,
      })

      if (res.success && res.id) {
        toast.success(`Facility "${name}" created successfully`)
        setOpen(false)
        setName("")
        setAddress("")
        setCity("")
        setState("")
        setZip("")
        setContactName("")
        setContactPhone("")
        setCheckInInstructions("")
        if (onFacilityCreated) {
          onFacilityCreated({ id: res.id, name, city, state })
        }
        router.refresh()
      } else {
        toast.error(res.error || "Failed to create facility")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-full border-brand-rule px-4 text-xs font-medium text-brand-ink hover:bg-brand-cream-soft cursor-pointer"
          >
            <Plus className="size-3.5" />
            Add Facility / Stop
          </Button>
        }
      />
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
              <MapPin className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-brand-ink">
              Add Logistics Facility / Distribution Center
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="facName">Facility Name *</Label>
              <Input
                id="facName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Americold Dallas Logistics Center"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facType">Facility Role</Label>
              <NativeSelect
                id="facType"
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value)}
              >
                {FACILITY_TYPES.map((t) => (
                  <NativeSelectOption key={t.value} value={t.value}>
                    {t.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="facAddress">Street Address *</Label>
            <Input
              id="facAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="1234 Commerce Blvd, Dock 14"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="facCountry">Country</Label>
              <NativeSelect
                id="facCountry"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value)
                  setState("")
                }}
              >
                {allCountries.map((c) => (
                  <NativeSelectOption key={c.code} value={c.code}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facCity">City *</Label>
              <Input
                id="facCity"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dallas"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facState">State / Region *</Label>
              {subdivisions.length > 0 ? (
                <NativeSelect
                  id="facState"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                >
                  <NativeSelectOption value="">—</NativeSelectOption>
                  {subdivisions.map((s) => (
                    <NativeSelectOption key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  id="facState"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Region"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facZip">Postal Code</Label>
              <Input
                id="facZip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="75201"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-rule/60">
            <div className="space-y-1.5">
              <Label htmlFor="operatingHours">Receiving Hours</Label>
              <Input
                id="operatingHours"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="06:00 - 15:00 M-F"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facContact">Dock Contact</Label>
              <Input
                id="facContact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Shipping Clerk"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facPhone">Dock Phone</Label>
              <Input
                id="facPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(214) 555-0199"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-brand-rule/60">
            <Label htmlFor="checkIn">Driver Gate & Check-in Instructions</Label>
            <Input
              id="checkIn"
              value={checkInInstructions}
              onChange={(e) => setCheckInInstructions(e.target.value)}
              placeholder="e.g. Check in at Guard Shack Gate 2. Hard hat & steel toes required on dock."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-brand-rule">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-brand-muted-soft hover:text-brand-ink"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-brand-ink px-5 text-xs text-brand-cream hover:bg-brand-ink-soft cursor-pointer"
            >
              {isPending ? <Spinner /> : "Save Facility"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
