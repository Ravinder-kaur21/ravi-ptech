"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import {
  Plus,
  Trash2,
  MapPin,
  Truck,
  DollarSign,
  Thermometer,
  FileText,
  Clock,
  ArrowRight,
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllCountries, getSubdivisions } from "@/lib/geography"
import { getAllCurrencies } from "@/lib/currencies"
import {
  type SalesTaxType,
  type LoadStop,
  SALES_TAX_CONFIG,
  computeTaxAndFinalRate,
} from "@/lib/tms-tax"

const EQUIPMENT_TYPES = [
  "Dry Van",
  "Reefer",
  "Flatbed",
  "Step Deck",
  "Power Only",
  "Box Truck",
] as const

export function NewLoadForm() {
  const router = useRouter()

  // Dynamically generated geography and currency datasets
  const allCountries = React.useMemo(() => getAllCountries(), [])
  const allCurrencies = React.useMemo(() => getAllCurrencies(), [])

  // Primary identifiers
  const [loadNumber, setLoadNumber] = React.useState(generateLoadNumber())
  const [customerName, setCustomerName] = React.useState("")
  const [tenderNumber, setTenderNumber] = React.useState("")

  // Equipment & Cargo specifications
  const [loadType, setLoadType] = React.useState<string>("Dry Van")
  const [commodity, setCommodity] = React.useState("")
  const [weight, setWeight] = React.useState("")
  const [isRefrigerated, setIsRefrigerated] = React.useState(false)
  const [temperature, setTemperature] = React.useState("")
  const [specialInstructions, setSpecialInstructions] = React.useState("")

  // Multi-stop route state (default 1 pickup, 1 delivery)
  const [stops, setStops] = React.useState<LoadStop[]>([
    {
      id: "stop-1",
      type: "pickup",
      facilityName: "",
      address: "",
      city: "",
      state: "",
      country: "US",
      zip: "",
      contactName: "",
      contactPhone: "",
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "strict",
      notes: "",
    },
    {
      id: "stop-2",
      type: "delivery",
      facilityName: "",
      address: "",
      city: "",
      state: "",
      country: "US",
      zip: "",
      contactName: "",
      contactPhone: "",
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "strict",
      notes: "",
    },
  ])

  // Financials & Tax Engine
  const [currency, setCurrency] = React.useState<string>("USD")
  const [rate, setRate] = React.useState("")
  const [salesTaxType, setSalesTaxType] = React.useState<SalesTaxType>("none")
  const [customTaxRate, setCustomTaxRate] = React.useState("")

  // Derived tax computation
  const baseRateNum = parseFloat(rate) || 0
  const customRateNum = parseFloat(customTaxRate) || 0
  const { taxRate, taxAmount, finalRate } = computeTaxAndFinalRate(
    baseRateNum,
    salesTaxType,
    customRateNum
  )

  // Handle reefer toggle synchronization
  const handleLoadTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setLoadType(val)
    if (val === "Reefer") {
      setIsRefrigerated(true)
    } else {
      setIsRefrigerated(false)
    }
  }

  // Route stop mutations
  const addStop = (type: "pickup" | "delivery") => {
    const lastStop = stops[stops.length - 1]
    const defaultCountry = lastStop?.country || "US"

    const newStop: LoadStop = {
      id: `stop-${Date.now()}`,
      type,
      facilityName: "",
      address: "",
      city: "",
      state: "",
      country: defaultCountry,
      zip: "",
      contactName: "",
      contactPhone: "",
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "strict",
      notes: "",
    }
    setStops((prev) => [...prev, newStop])
  }

  const removeStop = (id: string) => {
    if (stops.length <= 2) {
      toast.error("A load requires at least one pickup and one delivery stop.")
      return
    }
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  const updateStop = (id: string, field: keyof LoadStop, value: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  // First pickup and last delivery are used for high-level load indexing
  const firstPickup = stops.find((s) => s.type === "pickup") || stops[0]
  const lastDelivery =
    [...stops].reverse().find((s) => s.type === "delivery") || stops[stops.length - 1]

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        loadNumber,
        customerName: customerName || null,
        tenderNumber: tenderNumber || null,
        originAddress: firstPickup.address || null,
        originCity: firstPickup.city || null,
        originState: firstPickup.state || null,
        originZip: firstPickup.zip || null,
        originContact: firstPickup.contactName || null,
        originPhone: firstPickup.contactPhone || null,
        originAppointment: firstPickup.appointmentDate || null,
        destAddress: lastDelivery.address || null,
        destCity: lastDelivery.city || null,
        destState: lastDelivery.state || null,
        destZip: lastDelivery.zip || null,
        destContact: lastDelivery.contactName || null,
        destPhone: lastDelivery.contactPhone || null,
        destAppointment: lastDelivery.appointmentDate || null,
        stops,
        loadType,
        commodity: commodity || null,
        weight: weight || null,
        temperature: isRefrigerated ? temperature : null,
        isRefrigerated,
        currency,
        rate: rate ? baseRateNum.toFixed(2) : null,
        salesTaxType,
        salesTaxRate: taxRate ? taxRate.toString() : null,
        salesTaxAmount: taxAmount ? taxAmount.toFixed(2) : null,
        finalRate: finalRate ? finalRate.toFixed(2) : rate ? baseRateNum.toFixed(2) : null,
        specialInstructions: specialInstructions || null,
        pickupDate: firstPickup.appointmentDate || null,
        deliveryDate: lastDelivery.appointmentDate || null,
      }

      const r = await fetch("/api/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create load")
      }
      return r.json()
    },
    onSuccess: (data) => {
      toast.success(`Load ${loadNumber} created successfully`)
      router.push(`/loads/${data.id}`)
      router.refresh()
    },
    onError: (err: Error) => {
      console.error("[NEW-LOAD-FORM] error:", err)
      toast.error(err.message)
    },
  })

  const canSubmit =
    loadNumber.trim().length > 0 &&
    firstPickup.city.trim().length > 0 &&
    firstPickup.state.length > 0 &&
    lastDelivery.city.trim().length > 0 &&
    lastDelivery.state.length > 0 &&
    !create.isPending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) create.mutate()
      }}
      className="space-y-8 max-w-4xl"
    >
      {/* ─── SECTION 1: ORDER & CUSTOMER IDENTIFIERS ─── */}
      <Card className="p-6 border-brand-rule bg-brand-card space-y-6">
        <div className="flex items-center gap-2 border-b border-brand-rule/60 pb-3">
          <FileText className="size-4 text-brand-accent" />
          <h2 className="text-sm font-medium text-brand-ink uppercase tracking-wide">
            Order & Customer Specifications
          </h2>
        </div>

        <FieldGroup>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="loadNumber">Load Number</FieldLabel>
              <Input
                id="loadNumber"
                value={loadNumber}
                onChange={(e) => setLoadNumber(e.target.value)}
                className="font-mono"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="customer">Customer / Broker</FieldLabel>
              <Input
                id="customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Acme Freight Logistics"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tenderNumber">Customer PO / Tender #</FieldLabel>
              <Input
                id="tenderNumber"
                value={tenderNumber}
                onChange={(e) => setTenderNumber(e.target.value)}
                placeholder="PO-99420"
                className="font-mono text-xs"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <Field>
              <FieldLabel htmlFor="loadType">Equipment Type</FieldLabel>
              <NativeSelect
                id="loadType"
                value={loadType}
                onChange={handleLoadTypeChange}
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <NativeSelectOption key={t} value={t}>
                    {t}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="commodity">Commodity</FieldLabel>
              <Input
                id="commodity"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="Packaged Food / Retail"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="weight">Weight (lbs)</FieldLabel>
              <Input
                id="weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="42,500"
                inputMode="numeric"
              />
            </Field>
          </div>

          {/* Reefer / Temperature Controls */}
          {isRefrigerated && (
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-medium">
                <Thermometer className="size-4" />
                Refrigerated Temperature Control
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="temperature" className="text-xs">
                    Target Temperature (°F / °C)
                  </FieldLabel>
                  <Input
                    id="temperature"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="-10°F Continuous"
                    className="font-mono text-sm bg-white dark:bg-zinc-900"
                  />
                </Field>
              </div>
            </div>
          )}
        </FieldGroup>
      </Card>

      {/* ─── SECTION 2: MULTI-STOP ROUTE BUILDER ─── */}
      <Card className="p-6 border-brand-rule bg-brand-card space-y-6">
        <div className="flex items-center justify-between border-b border-brand-rule/60 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-brand-accent" />
            <h2 className="text-sm font-medium text-brand-ink uppercase tracking-wide">
              Multi-Stop Route Schedule ({stops.length} Stops)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addStop("pickup")}
              className="text-xs h-7 gap-1"
            >
              <Plus className="size-3" />
              Add Pickup
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addStop("delivery")}
              className="text-xs h-7 gap-1"
            >
              <Plus className="size-3" />
              Add Drop
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {stops.map((stop, index) => {
            const isPickup = stop.type === "pickup"
            const stopLabel = `${isPickup ? "Pickup" : "Delivery"} #${index + 1}`
            const currentCountry = stop.country || "US"
            const subdivisions = getSubdivisions(currentCountry)

            return (
              <div
                key={stop.id}
                className="relative rounded-lg border border-brand-rule bg-brand-cream/20 dark:bg-zinc-900/40 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand-ink text-brand-cream font-mono text-xs font-semibold">
                      {index + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        isPickup
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400"
                      }
                    >
                      {stopLabel}
                    </Badge>
                  </div>

                  {stops.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStop(stop.id)}
                      className="size-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Remove Stop"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-xs">Facility Name</FieldLabel>
                    <Input
                      value={stop.facilityName}
                      onChange={(e) =>
                        updateStop(stop.id, "facilityName", e.target.value)
                      }
                      placeholder={isPickup ? "Americold Distribution Center" : "Target Regional DC"}
                      className="text-sm"
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs">Street Address</FieldLabel>
                    <Input
                      value={stop.address}
                      onChange={(e) =>
                        updateStop(stop.id, "address", e.target.value)
                      }
                      placeholder="1234 Commerce Blvd"
                      className="text-sm"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Field>
                    <FieldLabel className="text-xs">Country</FieldLabel>
                    <NativeSelect
                      value={currentCountry}
                      onChange={(e) => {
                        const newCountry = e.target.value
                        updateStop(stop.id, "country", newCountry)
                        updateStop(stop.id, "state", "")
                      }}
                      className="text-sm"
                      required
                    >
                      {allCountries.map((c) => (
                        <NativeSelectOption key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs">City</FieldLabel>
                    <Input
                      value={stop.city}
                      onChange={(e) =>
                        updateStop(stop.id, "city", e.target.value)
                      }
                      placeholder={isPickup ? "Dallas" : "Houston"}
                      className="text-sm"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs">State / Province</FieldLabel>
                    {subdivisions.length > 0 ? (
                      <NativeSelect
                        value={stop.state}
                        onChange={(e) =>
                          updateStop(stop.id, "state", e.target.value)
                        }
                        className="text-sm"
                        required
                      >
                        <NativeSelectOption value="">Select Region</NativeSelectOption>
                        {subdivisions.map((s) => (
                          <NativeSelectOption key={s.code} value={s.code}>
                            {s.code} — {s.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    ) : (
                      <Input
                        value={stop.state}
                        onChange={(e) =>
                          updateStop(stop.id, "state", e.target.value)
                        }
                        placeholder="State / Region"
                        className="text-sm"
                        required
                      />
                    )}
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs">ZIP / Postal Code</FieldLabel>
                    <Input
                      value={stop.zip}
                      onChange={(e) =>
                        updateStop(stop.id, "zip", e.target.value)
                      }
                      placeholder="Postal Code"
                      className="text-sm font-mono"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <Field>
                    <FieldLabel className="text-xs">Appointment Date</FieldLabel>
                    <Input
                      type="date"
                      value={stop.appointmentDate || ""}
                      onChange={(e) =>
                        updateStop(stop.id, "appointmentDate", e.target.value)
                      }
                      className="text-sm"
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs">Time / Window</FieldLabel>
                    <Input
                      value={stop.appointmentTime || ""}
                      onChange={(e) =>
                        updateStop(stop.id, "appointmentTime", e.target.value)
                      }
                      placeholder="08:00 or 08:00-12:00"
                      className="text-sm"
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-xs">Facility Contact Phone</FieldLabel>
                    <Input
                      value={stop.contactPhone || ""}
                      onChange={(e) =>
                        updateStop(stop.id, "contactPhone", e.target.value)
                      }
                      placeholder="(214) 555-0199"
                      className="text-sm"
                    />
                  </Field>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ─── SECTION 3: FINANCIALS & SALES TAX ENGINE ─── */}
      <Card className="p-6 border-brand-rule bg-brand-card space-y-6">
        <div className="flex items-center gap-2 border-b border-brand-rule/60 pb-3">
          <DollarSign className="size-4 text-brand-accent" />
          <h2 className="text-sm font-medium text-brand-ink uppercase tracking-wide">
            Financial Terms & Sales Tax Engine
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <NativeSelect
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {allCurrencies.map((c) => (
                <NativeSelectOption key={c.code} value={c.code}>
                  {c.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="rate">Base Freight Rate</FieldLabel>
            <InputGroup>
              <InputGroupAddon>{currency}</InputGroupAddon>
              <InputGroupInput
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="3200"
                inputMode="decimal"
                className="font-mono text-sm"
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="salesTaxType">Sales Tax Engine</FieldLabel>
            <NativeSelect
              id="salesTaxType"
              value={salesTaxType}
              onChange={(e) => setSalesTaxType(e.target.value as SalesTaxType)}
            >
              {(Object.keys(SALES_TAX_CONFIG) as SalesTaxType[]).map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {SALES_TAX_CONFIG[key].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        {salesTaxType === "custom" && (
          <div className="max-w-xs">
            <Field>
              <FieldLabel htmlFor="customTaxRate" className="text-xs">
                Custom Tax Rate (%)
              </FieldLabel>
              <Input
                id="customTaxRate"
                value={customTaxRate}
                onChange={(e) => setCustomTaxRate(e.target.value)}
                placeholder="8.5"
                inputMode="decimal"
                className="font-mono text-sm"
              />
            </Field>
          </div>
        )}

        {/* Calculated Revenue Summary Breakdown */}
        {baseRateNum > 0 && (
          <div className="rounded-lg border border-brand-rule bg-brand-cream/30 dark:bg-zinc-900/60 p-4 space-y-2">
            <div className="flex justify-between text-xs text-brand-muted-soft">
              <span>Base Freight Revenue:</span>
              <span className="font-mono">
                {currency} ${baseRateNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-xs text-brand-muted-soft">
                <span>
                  Sales Tax ({SALES_TAX_CONFIG[salesTaxType]?.label || `${taxRate}%`}):
                </span>
                <span className="font-mono">
                  + {currency} ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold text-brand-ink pt-2 border-t border-brand-rule">
              <span>Total Customer Billable Rate:</span>
              <span className="font-mono text-brand-accent">
                {currency} ${finalRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="specialInstructions">
            Special Dispatch & Handling Instructions
          </FieldLabel>
          <Input
            id="specialInstructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g. Clean sweep trailer before loading, scale before & after pickup, call receiver 2 hrs out."
            className="text-sm"
          />
        </Field>
      </Card>

      {/* ─── ACTION FOOTER ─── */}
      <div className="flex items-center justify-between pt-4 border-t border-brand-rule">
        <div className="text-xs text-brand-muted-soft">
          {firstPickup.city && lastDelivery.city ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-brand-ink">
              <span>{firstPickup.city}, {firstPickup.state}</span>
              <ArrowRight className="size-3 text-brand-muted-soft" />
              <span>{lastDelivery.city}, {lastDelivery.state}</span>
              <span className="text-brand-muted-soft">({stops.length} stops)</span>
            </span>
          ) : (
            "Complete pickup & delivery stops to create load"
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/loads")}
            className="text-brand-muted-soft hover:text-brand-ink"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-10 px-6 rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream font-medium"
          >
            {create.isPending ? <Spinner /> : "Create Multi-Stop Load"}
          </Button>
        </div>
      </div>
    </form>
  )
}

function generateLoadNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `L-${n}`
}
