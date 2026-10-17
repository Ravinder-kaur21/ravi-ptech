/**
 * lib/currencies.ts — Dynamic Global Currency Engine.
 *
 * Provides ISO 4217 standard currency codes and localized names
 * generated dynamically via ECMAScript Intl standards.
 * Zero hardcoded lists.
 */

export interface CurrencyOption {
  code: string // ISO 4217 code e.g. "USD", "CAD", "EUR"
  name: string // Official currency name e.g. "US Dollar", "Canadian Dollar"
  label: string // e.g. "USD — US Dollar"
}

const PRIORITY_FREIGHT_CURRENCIES = ["USD", "CAD", "MXN", "EUR", "GBP"]

/**
 * Returns all active ISO 4217 currencies supported by the runtime,
 * with major logistics settlement currencies listed first.
 */
export function getAllCurrencies(locale: string = "en-US"): CurrencyOption[] {
  const displayNames = new Intl.DisplayNames([locale], { type: "currency" })
  const allCodes = Intl.supportedValuesOf("currency")

  const priority: CurrencyOption[] = []
  const rest: CurrencyOption[] = []

  for (const code of allCodes) {
    const name = displayNames.of(code) || code
    const item: CurrencyOption = {
      code,
      name,
      label: `${code} — ${name}`,
    }

    if (PRIORITY_FREIGHT_CURRENCIES.includes(code)) {
      priority.push(item)
    } else {
      rest.push(item)
    }
  }

  // Sort priority in defined sequence
  priority.sort(
    (a, b) =>
      PRIORITY_FREIGHT_CURRENCIES.indexOf(a.code) -
      PRIORITY_FREIGHT_CURRENCIES.indexOf(b.code)
  )

  // Sort remainder alphabetically by code
  rest.sort((a, b) => a.code.localeCompare(b.code))

  return [...priority, ...rest]
}

/**
 * Get currency display name by code.
 */
export function getCurrencyName(code: string, locale: string = "en-US"): string {
  if (!code) return ""
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "currency" })
    return displayNames.of(code.toUpperCase()) || code
  } catch {
    return code
  }
}
