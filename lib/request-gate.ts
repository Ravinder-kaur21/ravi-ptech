import "server-only"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { systemSetting, ipAllowlist, emailAllowlist, emailBlocklist } from "@/lib/schema"
import { and, desc, eq, sql, like, or } from "drizzle-orm"

/**
 * Request-time gating helpers.
 *
 * Three policies live in the DB but (before this module) were
 * write-only. These functions are the read side. Callers:
 *
 *   - app/(dashboard)/layout.tsx       → isMaintenanceMode()
 *   - app/(admin)/layout.tsx           → isIpAllowlisted()
 *   - app/signup/page.tsx              → isEmailAllowed()
 *
 * All three are cached at the request level via React `cache()`
 * (server actions / layouts can call them multiple times in a
 * single render without a DB hit each).
 */
import { cache } from "react"

// ─── Maintenance mode ───────────────────────────────────────────────────────

/**
 * Reads the `system_setting` row with key="maintenance". Returns
 * `true` iff the most-recent row says enabled=true AND we're not in
 * the window's past. Admins always see the app, never the
 * maintenance page — the caller is responsible for that.
 */
export const isMaintenanceMode = cache(async (): Promise<boolean> => {
  console.log("[REQUEST-GATE] checking maintenance mode")
  const [row] = await db
    .select({ value: systemSetting.value })
    .from(systemSetting)
    .where(eq(systemSetting.key, "maintenance"))
    .orderBy(desc(systemSetting.updatedAt))
    .limit(1)

  if (!row?.value) {
    console.log("[REQUEST-GATE] maintenance: not set")
    return false
  }
  const v = row.value as { enabled?: boolean; endsAt?: string | null }
  if (!v.enabled) {
    console.log("[REQUEST-GATE] maintenance: disabled in last row")
    return false
  }
  if (v.endsAt && new Date(v.endsAt).getTime() < Date.now()) {
    console.log(`[REQUEST-GATE] maintenance: window expired (${v.endsAt})`)
    return false
  }
  console.log("[REQUEST-GATE] maintenance: ON")
  return true
})

/** Detailed snapshot for the admin Security page UI. */
export const getMaintenanceSnapshot = cache(async (): Promise<{
  enabled: boolean
  message: string | null
  startedAt: string | null
  startedByEmail: string | null
  endsAt: string | null
}> => {
  const [row] = await db
    .select({ value: systemSetting.value, updatedAt: systemSetting.updatedAt })
    .from(systemSetting)
    .where(eq(systemSetting.key, "maintenance"))
    .orderBy(desc(systemSetting.updatedAt))
    .limit(1)
  const v = (row?.value ?? {}) as {
    enabled?: boolean
    message?: string | null
    startedAt?: string | null
    startedByEmail?: string | null
    endsAt?: string | null
  }
  return {
    enabled: !!v.enabled,
    message: v.message ?? null,
    startedAt: v.startedAt ?? null,
    startedByEmail: v.startedByEmail ?? null,
    endsAt: v.endsAt ?? null,
  }
})

// ─── IP allowlist ───────────────────────────────────────────────────────────

/**
 * Returns true if the requesting IP is allowed to hit /admin/*.
 * When the table is empty, we allow everyone (default-off).
 * Otherwise the request must match at least one CIDR.
 *
 * IPv4 only for v1. IPv6 entries are stored but always allowed
 * (the request IP comes from the proxy as IPv4).
 */
export const isIpAllowlisted = cache(async (): Promise<{
  allowlisted: boolean
  ip: string | null
  totalEntries: number
}> => {
  const all = await db.select({ cidr: ipAllowlist.cidr }).from(ipAllowlist)
  if (all.length === 0) {
    return { allowlisted: true, ip: null, totalEntries: 0 }
  }
  const h = await headers()
  const ip = extractClientIp(h)
  if (!ip) {
    // No IP we can read — fail closed.
    console.warn("[REQUEST-GATE] ip: no IP available, failing closed")
    return { allowlisted: false, ip: null, totalEntries: all.length }
  }
  const ok = all.some((row) => ipMatchesCidr(ip, row.cidr))
  console.log(
    `[REQUEST-GATE] ip: ${ip} ${ok ? "ALLOW" : "DENY"} (${all.length} entries)`
  )
  return { allowlisted: ok, ip, totalEntries: all.length }
})

function extractClientIp(h: Headers): string | null {
  // x-forwarded-for is a comma-separated list; the first entry is
  // the original client. Falls back to x-real-ip.
  const xff = h.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const xri = h.get("x-real-ip")
  if (xri) return xri.trim()
  return null
}

/**
 * IPv4 CIDR / single-IP matcher. We don't try to be RFC-perfect —
 * the table is admin-curated, so we just enforce the format.
 * Returns true on any malformed entry (caller should validate on
 * insert; we do — see ip-allowlist API route).
 */
function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (cidr.includes("/")) {
    const [base, bitsStr] = cidr.split("/")
    const bits = Number(bitsStr)
    if (!base || !Number.isFinite(bits) || bits < 0 || bits > 32) return false
    if (!isValidIpv4(base)) return false
    if (!isValidIpv4(ip)) return false
    return ipv4InCidr(ip, base, bits)
  }
  return isValidIpv4(ip) && isValidIpv4(cidr) && ip === cidr
}

function isValidIpv4(s: string): boolean {
  const parts = s.split(".")
  if (parts.length !== 4) return false
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false
    const n = Number(p)
    return n >= 0 && n <= 255
  })
}

function ipv4ToInt(ip: string): number {
  const p = ip.split(".").map(Number)
  return ((p[0]! << 24) | (p[1]! << 16) | (p[2]! << 8) | p[3]!) >>> 0
}

function ipv4InCidr(ip: string, base: string, bits: number): boolean {
  const ipInt = ipv4ToInt(ip)
  const baseInt = ipv4ToInt(base)
  if (bits === 0) return true
  const mask = ((0xffffffff << (32 - bits)) >>> 0)
  return (ipInt & mask) === (baseInt & mask)
}

// ─── Email allow / block ───────────────────────────────────────────────────

export type EmailPolicy = {
  ok: boolean
  reason:
    | null
    | "blocked_email"
    | "blocked_domain"
    | "not_in_allowlist"
}

/**
 * Check the email against blocklist first (always wins) then
 * against the allowlist (only enforced when non-empty).
 *
 * Patterns: exact "user@x.com" or wildcard "*@x.com".
 */
export const isEmailAllowed = cache(async (email: string): Promise<EmailPolicy> => {
  console.log(`[REQUEST-GATE] email check: ${email}`)
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return { ok: false, reason: "not_in_allowlist" }
  }
  const domain = "@" + (normalized.split("@")[1] ?? "")

  // Blocklist first
  const blocked = await db
    .select({ pattern: emailBlocklist.pattern })
    .from(emailBlocklist)
  for (const row of blocked) {
    if (matchesPattern(normalized, domain, row.pattern)) {
      console.log(`[REQUEST-GATE] email blocked by pattern ${row.pattern}`)
      return {
        ok: false,
        reason: row.pattern.startsWith("*@") ? "blocked_domain" : "blocked_email",
      }
    }
  }

  // Allowlist — only enforced when non-empty
  const allowed = await db
    .select({ pattern: emailAllowlist.pattern })
    .from(emailAllowlist)
  if (allowed.length === 0) {
    console.log("[REQUEST-GATE] email: allowlist empty, allowed")
    return { ok: true, reason: null }
  }
  for (const row of allowed) {
    if (matchesPattern(normalized, domain, row.pattern)) {
      console.log(`[REQUEST-GATE] email allowed by pattern ${row.pattern}`)
      return { ok: true, reason: null }
    }
  }
  console.log("[REQUEST-GATE] email not in allowlist")
  return { ok: false, reason: "not_in_allowlist" }
})

function matchesPattern(email: string, domain: string, pattern: string): boolean {
  const p = pattern.toLowerCase()
  if (p.startsWith("*@")) {
    return domain === p.slice(1) // "*@x.com" → "@x.com"
  }
  return email === p
}
