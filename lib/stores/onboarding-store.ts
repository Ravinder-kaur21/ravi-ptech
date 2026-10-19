"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type RoleId } from "@/lib/auth-roles"

// ─── Step 1: Company Identity ───
export type CompanyData = {
  companyName: string
  slug: string
  dotNumber: string
  mcNumber: string
}

// ─── Step 2: Business Type ───
export type BusinessType = "carrier" | "broker" | "both"

// ─── Step 3: Operation Scale ───
export type FleetSize = "1-5" | "6-20" | "21-50" | "51-100" | "100+"
export type TeamSize = "just-me" | "2-5" | "6-20" | "21-50" | "50+"
export type GeographicScope = "local" | "regional" | "national" | "international"

// ─── Step 4: Current Setup ───
export type CurrentTool = "spreadsheet" | "another-tms" | "multiple-tools" | "manual"
export type FreightType =
  | "dry-van"
  | "reefer"
  | "flatbed"
  | "ltl"
  | "specialized"
  | "intermodal"

// ─── Step 5: Invite Team ───
// Derives from RoleId (lib/auth-roles.ts) — all roles except "owner".
export type TeamRole = Exclude<RoleId, "owner">

export type TeamInvite = {
  email: string
  role: TeamRole
}

// ─── Step 6: Goals ───
export const GOALS = [
  "Dispatch faster",
  "Track loads in real time",
  "Keep documents together",
  "Invoice and get paid quicker",
  "Cut down manual paperwork",
  "Manage drivers and equipment",
  "Reduce empty miles",
  "Improve on-time delivery",
] as const

export type Goal = (typeof GOALS)[number]

// ─── Full Draft ───
export type OnboardingDraft = CompanyData & {
  // Step 2
  businessType: BusinessType | ""
  // Step 3
  fleetSize: FleetSize | ""
  teamSize: TeamSize | ""
  geographicScope: GeographicScope | ""
  // Step 4
  currentTool: CurrentTool | ""
  freightTypes: FreightType[]
  // Step 5
  teamInvites: TeamInvite[]
  // Step 6
  primaryGoals: Goal[]
}

export const initialDraft: OnboardingDraft = {
  companyName: "",
  slug: "",
  dotNumber: "",
  mcNumber: "",
  businessType: "",
  fleetSize: "",
  teamSize: "",
  geographicScope: "",
  currentTool: "",
  freightTypes: [],
  teamInvites: [],
  primaryGoals: [],
}

// ─── Store ───
type OnboardingState = {
  draft: OnboardingDraft
  currentStep: number
  completedSteps: number[]
  highestReached: number

  // Actions
  setField: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void
  toggleFreightType: (t: FreightType) => void
  toggleGoal: (g: Goal) => void
  addTeamInvite: () => void
  updateTeamInvite: (index: number, patch: Partial<TeamInvite>) => void
  removeTeamInvite: (index: number) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  reset: () => void
  isStepValid: (step: number) => boolean
  // Computed
  asksFleetSize: () => boolean
  totalSteps: () => number
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      draft: initialDraft,
      currentStep: 0,
      completedSteps: [],
      highestReached: 0,

      setField: (key, value) =>
        set((state) => ({
          draft: { ...state.draft, [key]: value },
        })),

      toggleFreightType: (t) =>
        set((state) => {
          const has = state.draft.freightTypes.includes(t)
          return {
            draft: {
              ...state.draft,
              freightTypes: has
                ? state.draft.freightTypes.filter((x) => x !== t)
                : [...state.draft.freightTypes, t],
            },
          }
        }),

      toggleGoal: (g) =>
        set((state) => {
          const has = state.draft.primaryGoals.includes(g)
          return {
            draft: {
              ...state.draft,
              primaryGoals: has
                ? state.draft.primaryGoals.filter((x) => x !== g)
                : [...state.draft.primaryGoals, g],
            },
          }
        }),

      addTeamInvite: () =>
        set((state) => ({
          draft: {
            ...state.draft,
            teamInvites: [...state.draft.teamInvites, { email: "", role: "member" }],
          },
        })),

      updateTeamInvite: (index, patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            teamInvites: state.draft.teamInvites.map((inv, i) =>
              i === index ? { ...inv, ...patch } : inv
            ),
          },
        })),

      removeTeamInvite: (index) =>
        set((state) => ({
          draft: {
            ...state.draft,
            teamInvites: state.draft.teamInvites.filter((_, i) => i !== index),
          },
        })),

      nextStep: () =>
        set((state) => {
          const newStep = state.currentStep + 1
          const completed = new Set(state.completedSteps)
          completed.add(state.currentStep)
          return {
            currentStep: newStep,
            completedSteps: Array.from(completed).sort((a, b) => a - b),
            highestReached: Math.max(state.highestReached, newStep),
          }
        }),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 0),
        })),

      goToStep: (step) =>
        set((state) => {
          if (step > state.highestReached) return state
          return { currentStep: step }
        }),

      reset: () =>
        set({
          draft: initialDraft,
          currentStep: 0,
          completedSteps: [],
          highestReached: 0,
        }),

      isStepValid: (step) => {
        const d = get().draft
        switch (step) {
          case 0:
            return d.companyName.trim().length >= 2 && d.slug.trim().length >= 2
          case 1:
            return d.businessType !== ""
          case 2: {
            if (!d.teamSize || !d.geographicScope) return false
            if (d.businessType !== "broker" && !d.fleetSize) return false
            return true
          }
          case 3:
            return d.currentTool !== "" && d.freightTypes.length > 0
          case 4:
            // Team invites are optional - any email entered must be valid
            return d.teamInvites.every((inv) => !inv.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email))
          case 5:
            return d.primaryGoals.length > 0
          default:
            return false
        }
      },

      asksFleetSize: () => get().draft.businessType !== "broker",

      totalSteps: () => 6,
    }),
    {
      name: "muvx-onboarding",
    }
  )
)
