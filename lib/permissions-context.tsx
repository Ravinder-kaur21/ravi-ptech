"use client"

import * as React from "react"
import { createContext, useContext, useMemo, useEffect, useState } from "react"

/**
 * Permission context — request-scoped Set of permission keys for the
 * current user in the current workspace. Populated server-side and
 * hydrated to the client on the dashboard layout.
 *
 * Read it from any client component with `usePermissions()`,
 * or gate visibility with `<Can>` from components/permissions/can.tsx.
 */

type PermissionsContextValue = {
  permissions: Set<string>
  role: string
  loaded: boolean
}

const Ctx = createContext<PermissionsContextValue>({
  permissions: new Set(),
  role: "member",
  loaded: false,
})

export function PermissionsProvider({
  permissions,
  role,
  children,
}: {
  permissions: string[]
  role: string
  children: React.ReactNode
}) {
  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions: new Set(permissions),
      role,
      loaded: true,
    }),
    [permissions, role]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePermissions(): Set<string> {
  const ctx = useContext(Ctx)
  return ctx.permissions
}

export function useCurrentRole(): string {
  const ctx = useContext(Ctx)
  return ctx.role
}

export function usePermissionsLoaded(): boolean {
  const ctx = useContext(Ctx)
  return ctx.loaded
}
