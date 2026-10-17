"use client"

import * as React from "react"
import { Plus, Box, Loader2 } from "lucide-react"
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
import { createTrailerAction } from "@/app/actions/tms"

export function AddTrailerDialog() {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [unitNumber, setUnitNumber] = React.useState("")
  const [type, setType] = React.useState("Dry Van (53')")
  const [make, setMake] = React.useState("")
  const [model, setModel] = React.useState("")
  const [year, setYear] = React.useState(new Date().getFullYear().toString())
  const [vin, setVin] = React.useState("")
  const [licensePlate, setLicensePlate] = React.useState("")
  const [status, setStatus] = React.useState<"available" | "in_use" | "maintenance">("available")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unitNumber.trim()) {
      toast.error("Trailer unit number is required")
      return
    }

    setLoading(true)
    try {
      const res = await createTrailerAction({
        unitNumber: unitNumber.trim(),
        type,
        make: make.trim() || null,
        model: model.trim() || null,
        year: year.trim() || null,
        vin: vin.trim() || null,
        licensePlate: licensePlate.trim() || null,
        status,
      })

      if (res.ok) {
        toast.success(`Trailer ${res.unitNumber} added to fleet`)
        setOpen(false)
        setUnitNumber("")
        setMake("")
        setModel("")
        setVin("")
        setLicensePlate("")
      } else {
        toast.error(res.error || "Failed to add trailer")
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
          <Button variant="outline" className="h-9 gap-1.5 rounded-full border-brand-rule px-4 text-xs font-medium text-brand-ink hover:bg-brand-cream-soft" />
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add trailer
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] bg-brand-card border-brand-rule">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
                <Box className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-brand-ink">
                Add Trailer Asset
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-brand-muted-soft">
              Register dry vans, reefers, or flatbeds to your equipment inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tUnitNumber" className="text-xs font-medium text-brand-ink">
                  Unit # *
                </Label>
                <Input
                  id="tUnitNumber"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. TRL-5301"
                  required
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tType" className="text-xs font-medium text-brand-ink">
                  Equipment Type
                </Label>
                <NativeSelect
                  id="tType"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="text-xs"
                >
                  <NativeSelectOption value="Dry Van (53')">Dry Van (53')</NativeSelectOption>
                  <NativeSelectOption value="Reefer (53')">Reefer (53')</NativeSelectOption>
                  <NativeSelectOption value="Flatbed (48')">Flatbed (48')</NativeSelectOption>
                  <NativeSelectOption value="Step Deck">Step Deck</NativeSelectOption>
                  <NativeSelectOption value="Conestoga">Conestoga</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tMake" className="text-xs font-medium text-brand-ink">
                  Make
                </Label>
                <Input
                  id="tMake"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Wabash"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tModel" className="text-xs font-medium text-brand-ink">
                  Model
                </Label>
                <Input
                  id="tModel"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Duraplate"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tYear" className="text-xs font-medium text-brand-ink">
                  Year
                </Label>
                <Input
                  id="tYear"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tVin" className="text-xs font-medium text-brand-ink">
                  VIN / Serial
                </Label>
                <Input
                  id="tVin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="1DW1532..."
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tPlate" className="text-xs font-medium text-brand-ink">
                  Plate / State
                </Label>
                <Input
                  id="tPlate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="TR-9821 IL"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tStatus" className="text-xs font-medium text-brand-ink">
                Initial Status
              </Label>
              <NativeSelect
                id="tStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="text-xs"
              >
                <NativeSelectOption value="available">Available (Uncoupled)</NativeSelectOption>
                <NativeSelectOption value="in_use">In Use (Coupled)</NativeSelectOption>
                <NativeSelectOption value="maintenance">Maintenance Inspection</NativeSelectOption>
              </NativeSelect>
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
              Save Trailer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
