"use client"

import * as React from "react"
import { Send, Truck, User, Box, Loader2, Building2, DollarSign } from "lucide-react"
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
import { dispatchLoadAction } from "@/app/actions/tms"

interface DispatchLoadDialogProps {
  loadId: string
  loadNumber: string
  availableDrivers: { id: string; firstName: string; lastName: string; status: string }[]
  availableTrucks: { id: string; unitNumber: string; status: string; currentLocation?: string | null }[]
  availableTrailers: { id: string; unitNumber: string; type?: string | null; status: string }[]
  availableCarriers?: { id: string; name: string; mcNumber?: string | null }[]
  defaultCarrierRate?: string | null
}

export function DispatchLoadDialog({
  loadId,
  loadNumber,
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

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (dispatchType === "carrier") {
      if (!carrierId) {
        toast.error("Please select an outside carrier")
        return
      }
    } else {
      if (!driverId) {
        toast.error("Please select a driver")
        return
      }
      if (!truckId) {
        toast.error("Please select a tractor unit")
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-9 gap-1.5 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-soft">
            <Send className="h-3.5 w-3.5" />
            Dispatch Load
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px] bg-brand-card border-brand-rule">
        <form onSubmit={handleDispatch}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
                <Send className="size-4" />
              </div>
              <DialogTitle className="font-serif text-xl text-brand-ink">
                Dispatch Load {loadNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-brand-muted-soft">
              Assign company drivers & tractors, or broker out to a contracted outside carrier.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg mt-3 border">
            <button
              type="button"
              onClick={() => setDispatchType("fleet")}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                dispatchType === "fleet"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Company Fleet
            </button>
            <button
              type="button"
              onClick={() => setDispatchType("carrier")}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                dispatchType === "carrier"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Outside Carrier
            </button>
          </div>

          <div className="grid gap-4 py-4 text-xs">
            {dispatchType === "fleet" ? (
              <>
                {/* Driver Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-ink font-medium">
                    <User className="size-3.5 text-brand-accent" />
                    <Label htmlFor="driver" className="text-xs">
                      Assigned Driver *
                    </Label>
                  </div>
                  {availableDrivers.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      No drivers found. Please add a driver in the Drivers section first.
                    </p>
                  ) : (
                    <NativeSelect
                      id="driver"
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="text-xs"
                      required
                    >
                      {availableDrivers.map((d) => (
                        <NativeSelectOption key={d.id} value={d.id}>
                          {d.firstName} {d.lastName} ({d.status})
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </div>

                {/* Tractor Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-ink font-medium">
                    <Truck className="size-3.5 text-brand-accent" />
                    <Label htmlFor="truck" className="text-xs">
                      Assigned Power Unit (Tractor) *
                    </Label>
                  </div>
                  {availableTrucks.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      No power units available. Please add a truck in the Fleet section first.
                    </p>
                  ) : (
                    <NativeSelect
                      id="truck"
                      value={truckId}
                      onChange={(e) => setTruckId(e.target.value)}
                      className="text-xs"
                      required
                    >
                      {availableTrucks.map((t) => (
                        <NativeSelectOption key={t.id} value={t.id}>
                          Unit {t.unitNumber} {t.currentLocation ? `· ${t.currentLocation}` : ""} ({t.status})
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </div>

                {/* Trailer Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-ink font-medium">
                    <Box className="size-3.5 text-brand-accent" />
                    <Label htmlFor="trailer" className="text-xs">
                      Assigned Trailer (Optional)
                    </Label>
                  </div>
                  <NativeSelect
                    id="trailer"
                    value={trailerId}
                    onChange={(e) => setTrailerId(e.target.value)}
                    className="text-xs"
                  >
                    <NativeSelectOption value="">No trailer attached / Bobtail</NativeSelectOption>
                    {availableTrailers.map((tr) => (
                      <NativeSelectOption key={tr.id} value={tr.id}>
                        Trailer {tr.unitNumber} {tr.type ? `(${tr.type})` : ""} — {tr.status}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </>
            ) : (
              <>
                {/* Outside Carrier Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-ink font-medium">
                    <Building2 className="size-3.5 text-brand-accent" />
                    <Label htmlFor="carrier" className="text-xs">
                      Contracted Carrier *
                    </Label>
                  </div>
                  {availableCarriers.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      No outside carriers found. Register one in Carrier Pay → Carriers Directory.
                    </p>
                  ) : (
                    <NativeSelect
                      id="carrier"
                      value={carrierId}
                      onChange={(e) => setCarrierId(e.target.value)}
                      className="text-xs"
                      required
                    >
                      {availableCarriers.map((c) => (
                        <NativeSelectOption key={c.id} value={c.id}>
                          {c.name} {c.mcNumber ? `(${c.mcNumber})` : ""}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  )}
                </div>

                {/* Carrier Rate */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-brand-ink font-medium">
                    <DollarSign className="size-3.5 text-brand-accent" />
                    <Label htmlFor="carrier-rate" className="text-xs">
                      Agreed Carrier Pay Rate ($)
                    </Label>
                  </div>
                  <Input
                    id="carrier-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={carrierRate}
                    onChange={(e) => setCarrierRate(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            {/* Planned Miles */}
            <div className="space-y-1.5">
              <Label htmlFor="miles" className="text-xs font-medium text-brand-ink">
                Estimated Trip Miles
              </Label>
              <Input
                id="miles"
                value={totalMiles}
                onChange={(e) => setTotalMiles(e.target.value)}
                placeholder="e.g. 740"
                className="font-mono text-xs"
              />
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
              disabled={
                loading ||
                (dispatchType === "fleet" &&
                  (availableDrivers.length === 0 || availableTrucks.length === 0)) ||
                (dispatchType === "carrier" && availableCarriers.length === 0)
              }
              className="h-8 text-xs bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm & Dispatch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
