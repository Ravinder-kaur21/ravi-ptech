"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus } from "lucide-react"
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
import { createCustomerAction } from "@/app/actions/tms-customers"

const PAYMENT_TERMS_OPTIONS = [
  "Net 30",
  "Net 15",
  "Net 60",
  "Due on Receipt",
  "QuickPay (2% 48hr)",
  "Prepaid",
]

export function CreateCustomerDialog({
  onCustomerCreated,
}: {
  onCustomerCreated?: (cust: { id: string; name: string }) => void
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const allCountries = React.useMemo(() => getAllCountries(), [])
  const allCurrencies = React.useMemo(() => getAllCurrencies(), [])

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [contactName, setContactName] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [city, setCity] = React.useState("")
  const [country, setCountry] = React.useState("US")
  const [state, setState] = React.useState("")
  const [zip, setZip] = React.useState("")
  const [paymentTerms, setPaymentTerms] = React.useState("Net 30")
  const [currency, setCurrency] = React.useState("USD")
  const [creditLimit, setCreditLimit] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const subdivisions = React.useMemo(
    () => getSubdivisions(country),
    [country]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Customer name is required")
      return
    }

    startTransition(async () => {
      const res = await createCustomerAction({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        contactName: contactName.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country,
        zip: zip.trim() || null,
        paymentTerms,
        currency,
        creditLimit: creditLimit.trim() || null,
        notes: notes.trim() || null,
      })

      if (res.success && res.id) {
        toast.success(`Customer "${name}" created successfully`)
        setOpen(false)
        setName("")
        setEmail("")
        setPhone("")
        setContactName("")
        setAddress("")
        setCity("")
        setState("")
        setZip("")
        setCreditLimit("")
        setNotes("")
        if (onCustomerCreated) {
          onCustomerCreated({ id: res.id, name })
        }
        router.refresh()
      } else {
        toast.error(res.error || "Failed to create customer")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-full bg-brand-ink px-4 text-xs font-medium text-brand-cream hover:bg-brand-ink-soft cursor-pointer"
          >
            <Plus className="size-3.5" />
            Add Customer
          </Button>
        }
      />
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-accent-tint text-brand-accent">
              <Building2 className="size-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-brand-ink">
              Add New Customer / Broker
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="custName">Company / Legal Name *</Label>
            <Input
              id="custName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Global Logistics Inc."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Operations Contact</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custPhone">Phone Number</Label>
              <Input
                id="custPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 012-3456"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custEmail">Billing / Invoicing Email</Label>
            <Input
              id="custEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ap@apexlogistics.com"
            />
          </div>

          {/* Address Section */}
          <div className="pt-2 border-t border-brand-rule/60 space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-brand-muted-soft">
              Billing Address
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="custAddress">Street Address</Label>
              <Input
                id="custAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Logistics Blvd, Suite 400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="custCountry">Country</Label>
                <NativeSelect
                  id="custCountry"
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

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="custCity">City</Label>
                <Input
                  id="custCity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Dallas"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custState">State / Region</Label>
                {subdivisions.length > 0 ? (
                  <NativeSelect
                    id="custState"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
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
                    id="custState"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Region"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custZip">Postal Code</Label>
                <Input
                  id="custZip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="75201"
                />
              </div>
            </div>
          </div>

          {/* Terms & Credit */}
          <div className="pt-2 border-t border-brand-rule/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <NativeSelect
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              >
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <NativeSelectOption key={opt} value={opt}>
                    {opt}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custCurrency">Default Currency</Label>
              <NativeSelect
                id="custCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {allCurrencies.map((c) => (
                  <NativeSelectOption key={c.code} value={c.code}>
                    {c.code}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="creditLimit">Credit Limit ($)</Label>
              <Input
                id="creditLimit"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="50,000"
              />
            </div>
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
              {isPending ? <Spinner /> : "Save Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
