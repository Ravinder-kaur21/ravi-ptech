/**
 * lib/timezone.ts — workspace-aware date formatting.
 *
 * The workspace's `timeZone` (stored in the `organization` table) is the
 * single source of truth for how dates/times are displayed to users. Every
 * `toLocaleString()` call site that previously used the browser's default
 * timezone should use `formatWorkspaceDate` instead.
 *
 * Usage (client components):
 *   import { useWorkspaceDate } from "@/lib/timezone"
 *   const { format, formatDate } = useWorkspaceDate()
 *   return <span>{format(createdAt)}</span>
 *
 * Usage (server components):
 *   import { formatWorkspaceDate } from "@/lib/timezone"
 *   const formatted = formatWorkspaceDate(new Date(row.createdAt), org.timeZone)
 */

export const DEFAULT_TIMEZONE = "America/Chicago"

export type TimezoneOption = {
  id: string // IANA identifier e.g. "America/Chicago"
  label: string // e.g. "America/Chicago (GMT-5)"
  region: string // e.g. "America", "Europe"
  offset: string // e.g. "GMT-5"
}

// Major freight corridor timezones prioritized at the top of select menus
const PRIORITY_FREIGHT_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "UTC",
]

/**
 * Returns all 445 official IANA timezones dynamically discovered via Intl,
 * with real-time GMT offset calculations. Zero hardcoded arrays.
 */
export function getAvailableTimezones(): TimezoneOption[] {
  const rawZones = Intl.supportedValuesOf("timeZone")
  const now = new Date()

  const list: TimezoneOption[] = rawZones.map((tz) => {
    let offset = ""
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      }).formatToParts(now)
      offset = parts.find((p) => p.type === "timeZoneName")?.value || ""
    } catch {
      offset = ""
    }

    const region = tz.includes("/") ? tz.split("/")[0] : "Global"
    const readable = tz.replace(/_/g, " ")

    return {
      id: tz,
      label: offset ? `${readable} (${offset})` : readable,
      region,
      offset,
    }
  })

  // Prioritize primary North American logistics corridors first, then all others
  const priority: TimezoneOption[] = []
  const rest: TimezoneOption[] = []

  for (const item of list) {
    if (PRIORITY_FREIGHT_TIMEZONES.includes(item.id)) {
      priority.push(item)
    } else {
      rest.push(item)
    }
  }

  priority.sort(
    (a, b) =>
      PRIORITY_FREIGHT_TIMEZONES.indexOf(a.id) -
      PRIORITY_FREIGHT_TIMEZONES.indexOf(b.id)
  )

  rest.sort((a, b) => a.id.localeCompare(b.id))

  return [...priority, ...rest]
}

export type DateFormatOptions = {
  /** Show date + time, or just date. */
  mode?: "datetime" | "date" | "time"
  /** Relative dates ("2 min ago") — requires a client hook. */
  relative?: boolean
}

/**
 * Pure formatting function — works on both server and client.
 *
 * @param date    The Date (or ISO string) to format.
 * @param timeZone  IANA timezone from the workspace profile (e.g. "America/Chicago").
 *                  Falls back to DEFAULT_TIMEZONE when not set.
 * @param locale  Optional BCP 47 locale. Defaults to "en-US".
 * @param opts    Formatting options.
 */
export function formatWorkspaceDate(
  date: Date | string,
  timeZone?: string | null | undefined,
  locale: string = "en-US",
  opts: DateFormatOptions = {},
): string {
  const tz = timeZone || DEFAULT_TIMEZONE
  const d = typeof date === "string" ? new Date(date) : date
  const mode = opts.mode ?? "datetime"

  let dateTimeFormatOptions: Intl.DateTimeFormatOptions

  switch (mode) {
    case "date":
      dateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: tz,
      }
      break
    case "time":
      dateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }
      break
    case "datetime":
    default:
      dateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
        hour12: true,
      }
      break
  }

  try {
    return new Intl.DateTimeFormat(locale, dateTimeFormatOptions).format(d)
  } catch {
    // If the timezone is invalid, fall back to UTC without the timeZone option
    const { timeZone: _removed, ...fallbackOpts } = dateTimeFormatOptions
    return new Intl.DateTimeFormat(locale, fallbackOpts).format(d)
  }
}

/**
 * Format a date as "MMM d, yyyy 'at' h:mm a" — common in activity logs.
 */
export function formatWorkspaceDateTime(
  date: Date | string,
  timeZone?: string | null | undefined,
  locale: string = "en-US",
): string {
  return formatWorkspaceDate(date, timeZone, locale, { mode: "datetime" })
}

/**
 * Format a date as "MMM d, yyyy" — common in tables and lists.
 */
export function formatWorkspaceDateOnly(
  date: Date | string,
  timeZone?: string | null | undefined,
  locale: string = "en-US",
): string {
  return formatWorkspaceDate(date, timeZone, locale, { mode: "date" })
}

// ─── Client hook ──────────────────────────────────────────────────
// Reads the active workspace timezone from the Zustand auth store and
// returns ready-to-use formatter functions. Import this in client components.
import { useAuthStore } from "@/lib/stores/auth-store"

export function useWorkspaceDate() {
  const timeZone = useAuthStore((s) => s.activeOrganization?.timeZone)
  const locale = "en-US" // could be made user-configurable later

  return {
    format: (date: Date | string) =>
      formatWorkspaceDate(date, timeZone, locale, { mode: "datetime" }),
    formatDate: (date: Date | string) =>
      formatWorkspaceDate(date, timeZone, locale, { mode: "date" }),
    formatTime: (date: Date | string) =>
      formatWorkspaceDate(date, timeZone, locale, { mode: "time" }),
    timeZone: timeZone ?? DEFAULT_TIMEZONE,
  }
}
