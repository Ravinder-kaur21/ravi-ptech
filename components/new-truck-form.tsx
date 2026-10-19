"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"

const truckStatuses = ["available", "maintenance", "out_of_service"] as const
type TruckStatus = (typeof truckStatuses)[number]

type TruckFormValues = {
  unitNumber: string
  make: string
  model: string
  licensePlate: string
  licenseState: string
  status: TruckStatus
  currentMiles: string
  nextServiceMiles: string
  nextServiceDate: string
}

function isTruckStatus(value: string): value is TruckStatus {
  return truckStatuses.some((status) => status === value)
}

const initialValues: TruckFormValues = {
  unitNumber: "",
  make: "",
  model: "",
  licensePlate: "",
  licenseState: "",
  status: "available",
  currentMiles: "",
  nextServiceMiles: "",
  nextServiceDate: "",
}

export function NewTruckForm() {
  const router = useRouter()
  const [values, setValues] = useState(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function update<K extends keyof TruckFormValues>(
    key: K,
    value: TruckFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError("")
    setSubmitting(true)

    try {
      const response = await fetch("/api/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          make: values.make || null,
          model: values.model || null,
          licensePlate: values.licensePlate || null,
          licenseState: values.licenseState || null,
          currentMiles: values.currentMiles || null,
          nextServiceMiles: values.nextServiceMiles || null,
          nextServiceDate: values.nextServiceDate || null,
        }),
      })
      const result = (await response.json()) as {
        id?: string
        error?: string
        warning?: string
        details?: { message: string }[]
      }
      if (!response.ok) {
        const validationMessage = result.details?.[0]?.message
        throw new Error(validationMessage || result.error || "Failed to add truck")
      }

      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success(`Truck ${values.unitNumber} added to the fleet`)
      }
      router.push("/fleet")
      router.refresh()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Failed to add truck"
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="unitNumber">Truck number</FieldLabel>
            <Input
              id="unitNumber"
              value={values.unitNumber}
              onChange={(event) => update("unitNumber", event.target.value)}
              placeholder="e.g. TRK-101"
              maxLength={50}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <NativeSelect
              id="status"
              value={values.status}
              onChange={(event) => {
                if (isTruckStatus(event.target.value)) {
                  update("status", event.target.value)
                }
              }}
            >
              <NativeSelectOption value="available">Available</NativeSelectOption>
              <NativeSelectOption value="maintenance">In maintenance</NativeSelectOption>
              <NativeSelectOption value="out_of_service">
                Out of service
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="make">Make</FieldLabel>
            <Input
              id="make"
              value={values.make}
              onChange={(event) => update("make", event.target.value)}
              placeholder="Freightliner"
              maxLength={100}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Input
              id="model"
              value={values.model}
              onChange={(event) => update("model", event.target.value)}
              placeholder="Cascadia"
              maxLength={100}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="licensePlate">License plate</FieldLabel>
            <Input
              id="licensePlate"
              value={values.licensePlate}
              onChange={(event) => update("licensePlate", event.target.value)}
              maxLength={50}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="licenseState">Plate state / province</FieldLabel>
            <Input
              id="licenseState"
              value={values.licenseState}
              onChange={(event) => update("licenseState", event.target.value)}
              maxLength={50}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="currentMiles">Current mileage</FieldLabel>
            <Input
              id="currentMiles"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.currentMiles}
              onChange={(event) => update("currentMiles", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="nextServiceMiles">Next service mileage</FieldLabel>
            <Input
              id="nextServiceMiles"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.nextServiceMiles}
              onChange={(event) =>
                update("nextServiceMiles", event.target.value)
              }
            />
          </Field>
        </div>

        <Field className="sm:max-w-xs">
          <FieldLabel htmlFor="nextServiceDate">Next service date</FieldLabel>
          <Input
            id="nextServiceDate"
            type="date"
            value={values.nextServiceDate}
            onChange={(event) => update("nextServiceDate", event.target.value)}
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2 border-t border-brand-rule pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/fleet")}
          disabled={submitting}
          className="text-brand-muted-soft hover:text-brand-ink"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !values.unitNumber.trim()}
          className="h-9 rounded-full bg-brand-ink px-5 text-brand-cream hover:bg-brand-ink-soft"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Add truck"
          )}
        </Button>
      </div>
    </form>
  )
}
