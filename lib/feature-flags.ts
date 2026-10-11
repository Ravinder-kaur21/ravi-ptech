import "server-only"
import { createHash } from "node:crypto"
import { cache } from "react"
import { db } from "@/lib/db"
import { and, eq, inArray } from "drizzle-orm"
import { featureFlag, userFeatureFlag, orgFeatureFlag } from "@/lib/schema"

/**
 * Feature-flag runtime helper.
 *
 * Usage from server code:
 *   import { isFeatureEnabled } from "@/lib/feature-flags"
 *   if (await isFeatureEnabled("new-dashboard", userId, orgId)) { ... }
 *
 * Precedence:
 *   1. user_feature_flag row (if any)
 *   2. org_feature_flag  row for any org the user belongs to
 *   3. rollout % bucket on (flag.key + user.id) hash
 *   4. feature_flag.default_value
 *
 * The hash for rollout is stable: the same (flag, user) pair always
 * resolves the same way, so a 25% rollout means exactly the same 25%
 * every call.
 *
 * `cache()` from react ensures we only hit the DB once per request
 * for a given (flag, user, org) triple.
 */

type FlagValue = string | number | boolean

function parseFlagValue(kind: string, raw: string): FlagValue {
  if (kind === "boolean") return raw === "true" || raw === "1"
  if (kind === "number") return Number(raw)
  return raw
}

function bucketPercent(flagKey: string, userId: string): number {
  // Stable hash → uniform 0..100
  const h = createHash("sha256")
    .update(`${flagKey}::${userId}`)
    .digest()
  // Use first 4 bytes as uint32
  const n = h.readUInt32BE(0)
  return (n % 10000) / 100 // 0.00..99.99
}

export const evaluateFlag = cache(
  async (
    key: string,
    opts: { userId?: string | null; orgIds?: string[] | null } = {}
  ): Promise<FlagValue> => {
    const [flag] = await db
      .select()
      .from(featureFlag)
      .where(eq(featureFlag.key, key))
      .limit(1)

    if (!flag) return false

    // 1. User override
    if (opts.userId) {
      const [u] = await db
        .select()
        .from(userFeatureFlag)
        .where(
          and(
            eq(userFeatureFlag.featureFlagKey, key),
            eq(userFeatureFlag.userId, opts.userId)
          )
        )
        .limit(1)
      if (u) return parseFlagValue(flag.kind, u.value)
    }

    // 2. Org override (any of the user's orgs)
    const orgIds = (opts.orgIds ?? []).filter(Boolean)
    if (orgIds.length > 0) {
      const rows = await db
        .select()
        .from(orgFeatureFlag)
        .where(
          and(
            eq(orgFeatureFlag.featureFlagKey, key),
            inArray(orgFeatureFlag.organizationId, orgIds)
          )
        )
        .limit(1)
      if (rows[0]) return parseFlagValue(flag.kind, rows[0].value)
    }

    // 3. Rollout %
    const pct = Number(flag.rolloutPercent)
    if (pcentSafe(pct) && opts.userId) {
      const bucket = bucketPercent(key, opts.userId)
      if (bucket >= pct) return false
      // Inside the rollout window — use default value
      return parseFlagValue(flag.kind, flag.defaultValue)
    }

    // 4. Default
    return parseFlagValue(flag.kind, flag.defaultValue)
  }
)

function pcentSafe(p: number): boolean {
  return Number.isFinite(p) && p > 0 && p < 100
}

/** Convenience: boolean check. */
export const isFeatureEnabled = cache(
  async (
    key: string,
    opts: { userId?: string | null; orgIds?: string[] | null } = {}
  ): Promise<boolean> => {
    const v = await evaluateFlag(key, opts)
    return v === true || v === "true" || v === 1
  }
)
