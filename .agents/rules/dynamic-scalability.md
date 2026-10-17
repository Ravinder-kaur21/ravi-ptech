# Strict Architectural Rule: Zero Hardcoding & Dynamic Scalability

## Core Mandate
Never hardcode static lists, enum-like geographic data, timezones, currency catalogs, tax tables, or regulatory jurisdictions into application code. Always prefer dynamic, standards-compliant, runtime-driven or database-backed abstractions that scale globally to 100+ countries.

## Specific Implementations:
1. **Timezones**:
   - Never use static lists of selected cities.
   - Always use `Intl.supportedValuesOf("timeZone")` via `@/lib/timezone` (`getAvailableTimezones()`) with live calculated GMT/UTC offsets.
2. **Currencies**:
   - Never hardcode lists of currencies (e.g. `['USD', 'CAD']`).
   - Always use `@/lib/currencies` (`getAllCurrencies()`) leveraging `Intl.supportedValuesOf("currency")` and `Intl.DisplayNames`.
3. **Geography (Countries & Subdivisions / States / Provinces)**:
   - Never hardcode state/province arrays (e.g., US states, Canadian provinces).
   - Always use `@/lib/geography` (`getAllCountries()` and `getSubdivisions(countryCode)` via ISO 3166-1/2 standard datasets) to allow any stop or facility in any of the 249 global jurisdictions.
4. **Sales Taxes & Financial Calculations**:
   - Provide standard presets but always support dynamic percentage overrides (`custom`) and dynamic jurisdiction lookups.
5. **Multi-Tenancy & Security**:
   - Always scope data to `tenantId` from authenticated session via `requireTenant` / `withTenant`.
   - Never hardcode user permissions; always enforce catalog permissions via `requireCatalogPermission`.
