/**
 * lib/geography.ts — Dynamic Global Geography Engine.
 *
 * Provides ISO 3166-1 (249 countries) and ISO 3166-2 (thousands of administrative
 * subdivisions: states, provinces, territories, cantons, departments).
 * Zero hardcoded country/state arrays.
 */

import { allCountries, type CountryData, type Region } from "country-region-data"

export interface CountryOption {
  code: string // ISO 3166-1 alpha-2 e.g. "US", "CA", "MX", "DE"
  name: string // Official country name
  subdivisionCount: number
}

export interface SubdivisionOption {
  code: string // ISO 3166-2 code e.g. "TX", "ON", "BC", "NL"
  name: string // Full subdivision name e.g. "Texas", "Ontario"
  countryCode: string
}

// Top freight trading jurisdictions placed first for convenient UX,
// followed by all other world nations in alphabetical order.
const PRIORITY_FREIGHT_COUNTRIES = ["US", "CA", "MX"]

/**
 * Returns all 249 official ISO 3166-1 countries, with major trade partners
 * prioritized at the top for optimal dispatch UX.
 */
export function getAllCountries(): CountryOption[] {
  const mapped = allCountries.map(([name, code, regions]) => ({
    name,
    code,
    subdivisionCount: regions ? regions.length : 0,
  }))

  const priority: CountryOption[] = []
  const rest: CountryOption[] = []

  for (const c of mapped) {
    if (PRIORITY_FREIGHT_COUNTRIES.includes(c.code)) {
      priority.push(c)
    } else {
      rest.push(c)
    }
  }

  // Sort priority in defined order
  priority.sort(
    (a, b) =>
      PRIORITY_FREIGHT_COUNTRIES.indexOf(a.code) -
      PRIORITY_FREIGHT_COUNTRIES.indexOf(b.code)
  )

  // Sort remainder alphabetically by name
  rest.sort((a, b) => a.name.localeCompare(b.name))

  return [...priority, ...rest]
}

/**
 * Returns all official ISO 3166-2 subdivisions (states, provinces, territories)
 * for any given country code.
 */
export function getSubdivisions(countryCode: string): SubdivisionOption[] {
  if (!countryCode) return []

  const upperCode = countryCode.toUpperCase()
  const country = allCountries.find(
    ([, code]) => code.toUpperCase() === upperCode
  )

  if (!country || !country[2]) return []

  const regions: Region[] = country[2]
  return regions.map(([regionName, regionCode]) => ({
    name: regionName,
    code: regionCode || regionName,
    countryCode: upperCode,
  }))
}

/**
 * Look up the full name of a country by its ISO code.
 */
export function getCountryName(countryCode: string): string {
  if (!countryCode) return ""
  const upperCode = countryCode.toUpperCase()
  const country = allCountries.find(
    ([, code]) => code.toUpperCase() === upperCode
  )
  return country ? country[0] : countryCode
}

/**
 * Look up the name of a subdivision (state/province) by country and subdivision code.
 */
export function getSubdivisionName(
  countryCode: string,
  subdivisionCode: string
): string {
  if (!countryCode || !subdivisionCode) return subdivisionCode || ""
  const regions = getSubdivisions(countryCode)
  const match = regions.find(
    (r) =>
      r.code.toUpperCase() === subdivisionCode.toUpperCase() ||
      r.name.toUpperCase() === subdivisionCode.toUpperCase()
  )
  return match ? match.name : subdivisionCode
}

/**
 * Formats a clean, multi-national geographic label.
 * e.g. "Dallas, TX, US" or "Toronto, ON, Canada"
 */
export function formatLocationString({
  city,
  state,
  countryCode,
  zip,
}: {
  city?: string | null
  state?: string | null
  countryCode?: string | null
  zip?: string | null
}): string {
  const parts: string[] = []
  if (city) parts.push(city)
  if (state) parts.push(state)
  if (zip) parts.push(zip)
  if (countryCode && countryCode !== "US") {
    parts.push(getCountryName(countryCode) || countryCode)
  }
  return parts.join(", ")
}
