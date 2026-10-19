"use client"

import { PermissionsProvider } from "@/lib/permissions-context"

/**
 * Wraps the dashboard children with the PermissionsProvider so any
 * client component can read the current user's effective permission
 * set without re-fetching. The set is computed server-side in the
 * dashboard layout and passed in as a plain string array.
 */
export function PermissionsBootstrap({
  permissions,
  role,
  children,
}: {
  permissions: string[]
  role: string
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider permissions={permissions} role={role}>
      {children}
    </PermissionsProvider>
  )
}
