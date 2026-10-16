"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { PRESET_LIST, presetOnCount } from "@/lib/role-presets"
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog"

export type RoleOption = {
  value: string
  label: string
  description: string
  onCount: number
  isCustom: boolean
}

type RolesApiResponse = {
  starter: {
    role: string
    label: string
    description: string
    onCount: number
    memberCount: number
  }[]
  custom: {
    id: string
    role: string
    label: string
    description: string
    clonedFrom: string | null
    onCount: number
    memberCount: number
  }[]
}

export function useWorkspaceRoles() {
  const { data, isLoading } = useQuery<RolesApiResponse>({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const res = await fetch("/api/settings/roles-summary")
      if (!res.ok) {
        return { starter: [], custom: [] }
      }
      return res.json()
    },
  })

  // Starter roles (excluding owner which is not assignable via dropdowns)
  const starterRoles = React.useMemo<RoleOption[]>(() => {
    if (data?.starter && data.starter.length > 0) {
      return data.starter
        .filter((r) => r.role !== "owner")
        .map((r) => ({
          value: r.role,
          label: r.label,
          description: r.description,
          onCount: r.onCount,
          isCustom: false,
        }))
    }
    return PRESET_LIST.filter((p) => p.role !== "owner").map((p) => ({
      value: p.role,
      label: p.label,
      description: p.description,
      onCount: presetOnCount(p.role, ALL_PERMISSION_KEYS),
      isCustom: false,
    }))
  }, [data?.starter])

  // Custom roles defined in this workspace
  const customRoles = React.useMemo<RoleOption[]>(() => {
    return (data?.custom ?? []).map((c) => ({
      value: c.role,
      label: c.label || c.role,
      description: c.description || (c.clonedFrom ? `Based on ${c.clonedFrom}` : "Custom workspace role"),
      onCount: c.onCount,
      isCustom: true,
    }))
  }, [data?.custom])

  const allAssignableRoles = React.useMemo<RoleOption[]>(() => {
    return [...starterRoles, ...customRoles]
  }, [starterRoles, customRoles])

  const roleLabelMap = React.useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>()
    map.set("owner", "Owner")
    for (const r of allAssignableRoles) {
      map.set(r.value, r.label)
    }
    return map
  }, [allAssignableRoles])

  const getRoleLabel = React.useCallback(
    (roleId: string): string => {
      if (roleId === "owner") return "Owner"
      return roleLabelMap.get(roleId) ?? roleId
    },
    [roleLabelMap]
  )

  const isCustomRole = React.useCallback(
    (roleId: string): boolean => {
      return customRoles.some((c) => c.value === roleId)
    },
    [customRoles]
  )

  return {
    starterRoles,
    customRoles,
    allAssignableRoles,
    getRoleLabel,
    isCustomRole,
    isLoading,
  }
}
