"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type User = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  phone?: string | null
  role?: string | null
}

type Organization = {
  id: string
  name: string
  slug: string
  logo?: string | null
  timeZone?: string | null
  // metadata comes from Better Auth as a record/object, not a string
  metadata?: Record<string, any> | null
}

type AuthState = {
  user: User | null
  activeOrganization: Organization | null
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setActiveOrganization: (org: Organization | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeOrganization: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setActiveOrganization: (org) => set({ activeOrganization: org }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () =>
        set({ user: null, activeOrganization: null, isLoading: false }),
    }),
    {
      name: "muvx-auth",
      partialize: (state) => ({
        // Don't persist isLoading, only user and org
        user: state.user,
        activeOrganization: state.activeOrganization,
      }),
    }
  )
)
