"use client"

import * as React from "react"
import { Plus, Truck, Loader2 } from "lucide-react"
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
import { createTruckAction } from "@/app/actions/tms"

export function AddTruckDialog() {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [unitNumber, setUnitNumber] = React.useState("")
  const [make, setMake] = React.useState("")
  const [model, setModel] = React.useState("")
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [vin, setVin] = React.useState("")
  const [licensePlate, setLicensePlate] = React.useState("")
  const [currentLocation, setCurrentLocation] = React.useState("")
  const [currentMiles, setCurrentMiles] = React.useState("")
  const [fuelType, setFuelType] = React.useState("Diesel")
  const [status, setStatus] = React.useState<"available" | "in_use" | "maintenance">("available")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitNumber.trim()) {
      toast.error("Unit number is required")
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
        status,
      })

      if (res.ok) {
        toast.success(`Tractor unit ${res.unitNumber} added to fleet`)
        setOpen(false)
        setUnitNumber("")
        setMake("")
        setModel("")
        setVin("")
        setLicensePlate("")
        setCurrentLocation("")
        setCurrentMiles("")
      } else {
        toast.error(res.error || "Failed to add truck")
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
        Add truck
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-brand-card border-brand-rule">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
                <Truck className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-brand-ink">
                Add Tractor Unit
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-brand-muted-soft">
              Register a power unit to your fleet for dispatching and mileage tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unitNumber" className="text-xs font-medium text-brand-ink">
                  Unit # *
                </Label>
                <Input
                  id="unitNumber"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. TRK-104"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-medium text-brand-ink">
                  Status
                </Label>
                <NativeSelect
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="text-xs"
                >
                  <NativeSelectOption value="available">Available</NativeSelectOption>
                  <NativeSelectOption value="in_use">In Use / Dispatched</NativeSelectOption>
                  <NativeSelectOption value="maintenance">Maintenance</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="make" className="text-xs font-medium text-brand-ink">
                  Make
                </Label>
                <Input
                  id="make"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Freightliner"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model" className="text-xs font-medium text-brand-ink">
                  Model
                </Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Cascadia"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-xs font-medium text-brand-ink">
                  Year
                </Label>
                <Input
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2025"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vin" className="text-xs font-medium text-brand-ink">
                  VIN
                </Label>
                <Input
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="1FUJGLDR5PL..."
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licensePlate" className="text-xs font-medium text-brand-ink">
                  License Plate
                </Label>
                <Input
                  id="licensePlate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="P64821"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentLocation" className="text-xs font-medium text-brand-ink">
                  Current Terminal / Location
                </Label>
                <Input
                  id="currentLocation"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="Dallas Terminal, TX"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currentMiles" className="text-xs font-medium text-brand-ink">
                  Odometer Miles
                </Label>
                <Input
                  id="currentMiles"
                  value={currentMiles}
                  onChange={(e) => setCurrentMiles(e.target.value)}
                  placeholder="148,200"
                  className="font-mono text-xs"
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
              Save Tractor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
