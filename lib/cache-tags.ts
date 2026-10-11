/**
 * Cache tag helpers. v1 is a no-op shim that just logs what was
 * "invalidated". When we wire React Query / Next cache invalidation
 * properly, this becomes the single place that fans out updates.
 */
export function invalidateCache(tags: string[]) {
  if (tags.length === 0) return
  console.log("[CACHE] invalidate →", tags)
}

export function revalidateAllAdminQueries() {
  invalidateCache([
    "admin:users",
    "admin:stats",
    "admin:appeals",
    "admin:workspaces",
  ])
}