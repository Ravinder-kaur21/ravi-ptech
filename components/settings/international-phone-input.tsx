"use client"

import { useMemo, useState } from "react"
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/max"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "cn"

const countries = getCountries()

function countryFlag(country: CountryCode) {
  return String.fromCodePoint(
    ...country
      .split("")
      .map((character) => 127397 + character.charCodeAt(0)),
  )
}

export function InternationalPhoneInput({
  id,
  value,
  onChange,
  error,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const [country, setCountry] = useState<CountryCode | null>(null)
  const [nationalNumber, setNationalNumber] = useState("")
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const countryNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "region" }),
    [],
  )
  const countryOptions = useMemo(
    () =>
      countries
        .map((code) => ({
          code,
          name: countryNames.of(code) ?? code,
          callingCode: getCountryCallingCode(code),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [countryNames],
  )
  const selectedCountry = countryOptions.find((item) => item.code === country)

  function handleNumberChange(input: string) {
    const digits = input.replace(/\D/g, "")
    const formatted = country ? new AsYouType(country).input(digits) : digits
    setNationalNumber(formatted)

    const parsed = country ? parsePhoneNumberFromString(digits, country) : null
    onChange(
      parsed?.country === country && parsed.isValid() ? parsed.number : "",
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                aria-label="Select phone country"
                aria-expanded={countryPickerOpen}
                className="h-10 min-w-[150px] justify-between px-2.5"
              />
            }
          >
            {selectedCountry ? (
              <span className="flex items-center gap-2 truncate">
                <span aria-hidden="true">{countryFlag(selectedCountry.code)}</span>
                <span className="truncate">{selectedCountry.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Choose country</span>
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country or calling code..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                {countryOptions.map((item) => (
                  <CommandItem
                    key={item.code}
                    value={`${item.name} ${item.code} +${item.callingCode}`}
                    onSelect={() => {
                      setCountry(item.code)
                      setNationalNumber("")
                      onChange("")
                      setCountryPickerOpen(false)
                    }}
                  >
                    <span aria-hidden="true">{countryFlag(item.code)}</span>
                    <span className="flex-1">{item.name}</span>
                    <span className="text-muted-foreground">
                      +{item.callingCode}
                    </span>
                    <Check
                      className={cn(
                        "size-4",
                        country === item.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="relative flex min-w-0 flex-1 items-center">
          {selectedCountry && (
            <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
              +{selectedCountry.callingCode}
            </span>
          )}
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={country ? "Phone number" : "Choose a country first"}
            value={nationalNumber}
            disabled={!country}
            onChange={(event) => handleNumberChange(event.target.value)}
            aria-invalid={Boolean(error)}
            className={cn("h-10", selectedCountry && "pl-12")}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {value
          ? `International format: ${value}`
          : "Choose the teammate’s country, then enter their phone number."}
      </p>
    </div>
  )
}
