"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, Truck, Plus } from "lucide-react"
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
import { getAllCurrencies } from "@/lib/currencies"
import { createCarrierAction } from "@/app/actions/tms-carrier"

const PAYMENT_TERMS = [
  "Net 30",
  "Net 15",
  "Net 7",
  "QuickPay (2% / 48hr)",
  "QuickPay (3% / 24hr)",
  "Due on Receipt",
  "Prepaid",
]

export function CreateCarrierDialog({
  onCarrierCreated,
}: {
  onCarrierCreated?: (c: { id: string; name: string }) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const allCountries = React.useMemo(() => getAllCountries(), [])
  const allCurrencies = React.useMemo(() => getAllCurrencies(), [])

  const [name, setName] = React.useState("")
  const [mcNumber, setMcNumber] = React.useState("")
  const [dotNumber, setDotNumber] = React.useState("")
  const [contactName, setContactName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [city, setCity] = React.useState("")
  const [country, setCountry] = React.useState("US")
  const [state, setState] = React.useState("")
  const [zip, setZip] = React.useState("")
  const [taxId, setTaxId] = React.useState("")
  const [paymentTerms, setPaymentTerms] = React.useState("Net 30")
  const [currency, setCurrency] = React.useState("USD")
  const [insuranceExpiry, setInsuranceExpiry] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const subdivisions = React.useMemo(
    () => getSubdivisions(country),
    [country]
  )

  const handleCountryChange = (c: string) => {
    setCountry(c)
    setState("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Carrier company name is required")
      return
    }

    startTransition(async () => {
      const res = await createCarrierAction({
        name: name.trim(),
        mcNumber: mcNumber.trim() || undefined,
        dotNumber: dotNumber.trim() || undefined,
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country || "US",
        zip: zip.trim() || undefined,
        taxId: taxId.trim() || undefined,
        paymentTerms: paymentTerms || "Net 30",
        currency: currency || "USD",
        insuranceExpiry: insuranceExpiry ? insuranceExpiry : undefined,
        notes: notes.trim() || undefined,
      })

      if (res.success && res.id) {
        toast.success(`Carrier "${name.trim()}" registered successfully`)
        setOpen(false)
        setName("")
        setMcNumber("")
        setDotNumber("")
        setContactName("")
        setEmail("")
        setPhone("")
        setAddress("")
        setCity("")
        setState("")
        setZip("")
        setTaxId("")
        setInsuranceExpiry("")
        setNotes("")
        onCarrierCreated?.({ id: res.id, name: name.trim() })
        router.refresh()
      } else {
        toast.error(res.error || "Failed to register carrier")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Outside Carrier
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Register Outside Carrier</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add an authorized motor carrier or power-only partner for brokered trips.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Identity & Authorities */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Carrier Identity & Authorities
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carrier-name" className="text-xs font-medium">
                Legal Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="carrier-name"
                placeholder="e.g. Apex Freight Logistics LLC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mc-number" className="text-xs font-medium">
                  MC / FF Number
                </Label>
                <Input
                  id="mc-number"
                  placeholder="e.g. MC-123456"
                  value={mcNumber}
                  onChange={(e) => setMcNumber(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dot-number" className="text-xs font-medium">
                  USDOT Number
                </Label>
                <Input
                  id="dot-number"
                  placeholder="e.g. 3948210"
                  value={dotNumber}
                  onChange={(e) => setDotNumber(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Primary Contact & Dispatch
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="carrier-contact" className="text-xs font-medium">
                  Contact Person
                </Label>
                <Input
                  id="carrier-contact"
                  placeholder="e.g. Marcus Vance"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="carrier-email" className="text-xs font-medium">
                  Dispatch Email
                </Label>
                <Input
                  id="carrier-email"
                  type="email"
                  placeholder="dispatch@carrier.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="carrier-phone" className="text-xs font-medium">
                  Dispatch Phone
                </Label>
                <Input
                  id="carrier-phone"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Remittance Address & Origin Location
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carrier-address" className="text-xs font-medium">
                Street Address
              </Label>
              <Input
                id="carrier-address"
                placeholder="100 Transport Blvd, Suite 200"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-country" className="text-xs font-medium">
                  Country
                </Label>
                <NativeSelect
                  id="carrier-country"
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="h-9 text-sm"
                >
                  {allCountries.map((c) => (
                    <NativeSelectOption key={c.code} value={c.code}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-city" className="text-xs font-medium">
                  City
                </Label>
                <Input
                  id="carrier-city"
                  placeholder="Dallas"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-state" className="text-xs font-medium">
                  State / Region
                </Label>
                {subdivisions.length > 0 ? (
                  <NativeSelect
                    id="carrier-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-9 text-sm"
                  >
                    <NativeSelectOption value="">Select region...</NativeSelectOption>
                    {subdivisions.map((s) => (
                      <NativeSelectOption key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    id="carrier-state"
                    placeholder="Region"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-9 text-sm"
                  />
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-zip" className="text-xs font-medium">
                  Postal Code
                </Label>
                <Input
                  id="carrier-zip"
                  placeholder="75201"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Compliance & Remittance Terms */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Settlement Terms & Insurance Compliance
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-terms" className="text-xs font-medium">
                  Payment Terms
                </Label>
                <NativeSelect
                  id="carrier-terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-9 text-sm"
                >
                  {PAYMENT_TERMS.map((term) => (
                    <NativeSelectOption key={term} value={term}>
                      {term}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-currency" className="text-xs font-medium">
                  Currency
                </Label>
                <NativeSelect
                  id="carrier-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 text-sm"
                >
                  {allCurrencies.map((c) => (
                    <NativeSelectOption key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-tax-id" className="text-xs font-medium">
                  Tax ID / EIN
                </Label>
                <Input
                  id="carrier-tax-id"
                  placeholder="XX-XXXXXXX"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="carrier-insurance" className="text-xs font-medium">
                  Insurance Expiry
                </Label>
                <Input
                  id="carrier-insurance"
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {insuranceExpiry && new Date(insuranceExpiry) < new Date(Date.now() + 14 * 86400000) && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Notice: Insurance certificate expires in less than 14 days or is already expired.</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="carrier-notes" className="text-xs font-medium">
              Internal Carrier Notes
            </Label>
            <Input
              id="carrier-notes"
              placeholder="e.g. Requires 24-hr macro-point check calls; preferred reefer carrier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Spinner className="h-4 w-4 mr-2" />}
              Save Carrier
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
