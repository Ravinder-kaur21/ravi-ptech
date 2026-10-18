/**
 * Muvx TMS — FleetHunt Share-Link Telematics & Geofence Engine
 *
 * Provides real-time GPS tracking parsing, stale signal detection,
 * haversine geofence proximity calculations, and live ETA tracking
 * for commercial power units.
 */

export const SEED_FLEETHUNT_LINK =
  "https://app.fleethunt.ca/share/7d18252d-9d8b-4c83-9454-2be6c83e7597"

/** Signal staleness threshold in minutes */
export const FLEETHUNT_STALE_MINUTES = 20
/** Arrival geofence detection radius in statute miles */
export const ARRIVAL_RADIUS_MILES = 1.5
/** Polling cadence for in-transit tracking */
export const TRACKING_POLL_MS = 3 * 60 * 1000
/** Delay threshold triggering late warning (minutes) */
export const LATE_THRESHOLD_MINUTES = 30
/** Device local timezone offset */
export const TRACKER_UTC_OFFSET_HOURS = -6

/**
 * Extract share UUID from any FleetHunt URL or raw identifier
 */
export function parseFleethuntShareId(input: string): string | null {
  const raw = (input ?? "").trim()
  if (!raw) return null
  const match = raw.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  )
  if (match) return match[0]!.toLowerCase()
  const seg = raw.replace(/[?#].*$/, "").split("/").filter(Boolean).pop()
  return seg && /^[0-9a-zA-Z-]{16,60}$/.test(seg) ? seg.toLowerCase() : null
}

export function fleethuntShareUrl(shareId: string): string {
  return `https://app.fleethunt.ca/share/${shareId}`
}

/**
 * Great-circle distance between two geographic coordinates in miles
 */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3958.7613
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface LiveTruckPosition {
  truckId: string
  truckLabel: string
  shareId: string
  lat: number
  lng: number
  dtTracker: string
  dtChangedAt: Date | null
  fetchedAt: Date | null
  speedKmh: number | null
  address: string
  tripId: string | null
  nextStopIndex: number | null
  etaSeconds: number | null
  etaMiles: number | null
  etaAt: Date | null
  lastError: string | null
}

export function positionStale(
  pos: LiveTruckPosition | null,
  now: Date = new Date()
): boolean {
  if (!pos) return true
  if (pos.lastError) return true
  const basis = pos.dtChangedAt ?? pos.fetchedAt
  if (!basis) return true
  return now.getTime() - basis.getTime() > FLEETHUNT_STALE_MINUTES * 60_000
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—"
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  return `${h}h ${String(mins % 60).padStart(2, "0")}m`
}
