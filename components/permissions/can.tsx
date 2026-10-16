"use client"

import * as React from "react"
import { usePermissions } from "@/lib/permissions-context"

/**
 * <Can permission="loads.create">…</Can>
 *
 * Renders children only when the current user has the named permission
 * in the active workspace. Renders `fallback` (default null) otherwise.
 *
 * No role names — only permission keys. This is the only primitive
 * the UI uses to gate visibility.
 */
export function Can({
  permission,
  permissions,
  fallback = null,
  children,
}: {
  permission?: string
  /** Optional: require multiple keys (all must be ON). */
  permissions?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const perms = usePermissions()
  const required = permissions ?? (permission ? [permission] : [])
  for (const k of required) {
    if (!perms.has(k)) return <>{fallback}</>
  }
  return <>{children}</>
}

/** Inline helper. */
export function useCan(key: string): boolean {
  const perms = usePermissions()
  return perms.has(key)
}

/** Multiple — all must be ON. */
export function useCanAll(keys: string[]): boolean {
  const perms = usePermissions()
  for (const k of keys) if (!perms.has(k)) return false
  return true
}

/** Multiple — any one ON is enough. */
export function useCanAny(keys: string[]): boolean {
  const perms = usePermissions()
  for (const k of keys) if (perms.has(k)) return true
  return false
}
