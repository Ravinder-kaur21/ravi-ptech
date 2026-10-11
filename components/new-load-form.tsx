"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
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
import { US_STATES } from "@/lib/us-states"

export function NewLoadForm() {
  const router = useRouter()
  const [loadNumber, setLoadNumber] = React.useState(generateLoadNumber())
  const [customerName, setCustomerName] = React.useState("")
  const [originCity, setOriginCity] = React.useState("")
  const [originState, setOriginState] = React.useState("")
  const [destCity, setDestCity] = React.useState("")
  const [destState, setDestState] = React.useState("")
  const [rate, setRate] = React.useState("")
  const [commodity, setCommodity] = React.useState("")

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadNumber,
          customerName: customerName || null,
          originCity: originCity || null,
          originState: originState || null,
          destCity: destCity || null,
          destState: destState || null,
          rate: rate || null,
          commodity: commodity || null,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create load")
      }
      return r.json()
    },
    onSuccess: (data) => {
      console.log("[NEW-LOAD-FORM] created:", data)
      toast.success(`Load ${loadNumber} created`)
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
    originCity.trim().length > 0 &&
    originState.length > 0 &&
    destCity.trim().length > 0 &&
    destState.length > 0 &&
    !create.isPending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) create.mutate()
      }}
      className="space-y-6"
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="loadNumber">Load number</FieldLabel>
            <Input
              id="loadNumber"
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              className="font-mono"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="customer">Customer</FieldLabel>
            <Input
              id="customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Acme Logistics"
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field className="col-span-2">
            <FieldLabel htmlFor="originCity">Origin city</FieldLabel>
            <Input
              id="originCity"
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value)}
              placeholder="Dallas"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="originState">State</FieldLabel>
            <NativeSelect
              id="originState"
              value={originState}
              onChange={(e) => setOriginState(e.target.value)}
              required
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {US_STATES.map((s) => (
                <NativeSelectOption key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field className="col-span-2">
            <FieldLabel htmlFor="destCity">Destination city</FieldLabel>
            <Input
              id="destCity"
              value={destCity}
              onChange={(e) => setDestCity(e.target.value)}
              placeholder="Houston"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="destState">State</FieldLabel>
            <NativeSelect
              id="destState"
              value={destState}
              onChange={(e) => setDestState(e.target.value)}
              required
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {US_STATES.map((s) => (
                <NativeSelectOption key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="rate">Rate</FieldLabel>
            <InputGroup>
              <InputGroupAddon>$</InputGroupAddon>
              <InputGroupInput
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="2500"
                inputMode="decimal"
                className="font-mono"
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="commodity">Commodity</FieldLabel>
            <Input
              id="commodity"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="General freight"
            />
          </Field>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-2 pt-2">
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
          className="h-9 max-w-[200px] rounded-full bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
        >
          {create.isPending ? (
            <Spinner />
          ) : (
            "Create load"
          )}
        </Button>
      </div>
    </form>
  )
}

function generateLoadNumber() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `L-${n}`
}
