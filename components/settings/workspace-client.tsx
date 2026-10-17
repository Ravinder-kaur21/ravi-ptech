"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import {
  updateWorkspaceProfileAction,
  type UpdateWorkspaceProfileInput,
} from "@/app/actions/workspace"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Building2,
  Check,
  AlertCircle,
  Lock,
  Upload,
  X,
  Truck,
  ShieldCheck,
  Users,
  Compass,
  Wrench,
  Package,
  Target,
  ArrowLeft,
  ExternalLink,
  History,
  Globe,
  Mail,
  Phone,
  Coins,
  Clock,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { getAvailableTimezones } from "@/lib/timezone"
import { getAllCurrencies } from "@/lib/currencies"
import { getAllCountries } from "@/lib/geography"

// ─── Business & Onboarding Scale Options ─────────────────────────
const BUSINESS_TYPES = [
  { value: "carrier", label: "Carrier (Own trucks & drivers)" },
  { value: "broker", label: "Freight Broker (Non-asset logistics)" },
  { value: "both", label: "Both (Asset carrier + Brokerage)" },
  { value: "3pl", label: "3PL (Third-party logistics provider)" },
  { value: "shipper", label: "Direct Shipper / Private Fleet" },
  { value: "other", label: "Other Logistics Service" },
]

const FLEET_SIZES = [
  { value: "1-5", label: "1–5 trucks (Small Fleet)" },
  { value: "6-20", label: "6–20 trucks (Growing Fleet)" },
  { value: "21-50", label: "21–50 trucks (Mid-Size Carrier)" },
  { value: "51-100", label: "51–100 trucks (Commercial Fleet)" },
  { value: "100+", label: "100+ trucks (Enterprise Fleet)" },
]

const TEAM_SIZES = [
  { value: "just-me", label: "Just me (Owner-Operator)" },
  { value: "2-5", label: "2–5 people (Lean Team)" },
  { value: "6-20", label: "6–20 people (Growing Office)" },
  { value: "21-50", label: "21–50 people (Multi-Department)" },
  { value: "50+", label: "50+ people (Enterprise Organization)" },
]

const SCOPES = [
  { value: "local", label: "Local (Metro / Single Region)" },
  { value: "regional", label: "Regional (Multi-State Corridors)" },
  { value: "national", label: "National (Coast-to-Coast 48 States)" },
  { value: "international", label: "Cross-Border (US, Canada, Mexico)" },
]

const TOOLS = [
  { value: "spreadsheet", label: "Spreadsheets (Excel / Google Sheets)" },
  { value: "another-tms", label: "Another TMS (Migrating to Muvx)" },
  { value: "multiple-tools", label: "A patchwork of disjointed tools" },
  { value: "manual", label: "Manual (Paper, phone, SMS dispatching)" },
]

const FREIGHT_TYPES = [
  { id: "dry-van", label: "Dry Van", desc: "General enclosed freight" },
  { id: "reefer", label: "Refrigerated (Reefer)", desc: "Temperature-controlled loads" },
  { id: "flatbed", label: "Flatbed & Stepdeck", desc: "Building materials & open deck" },
  { id: "ltl", label: "LTL (Less-Than-Truckload)", desc: "Consolidated freight" },
  { id: "specialized", label: "Specialized / Heavy Haul", desc: "Overweight & oversize" },
  { id: "intermodal", label: "Intermodal & Drayage", desc: "Port & rail containers" },
]

const STRATEGIC_GOALS = [
  "Dispatch faster",
  "Track loads in real time",
  "Keep documents together",
  "Invoice and get paid quicker",
  "Cut down manual paperwork",
  "Manage drivers and equipment",
  "Reduce empty miles",
  "Improve on-time delivery",
]

const DYNAMIC_CURRENCIES = getAllCurrencies()
const DYNAMIC_TIMEZONES = getAvailableTimezones()
const DYNAMIC_COUNTRIES = getAllCountries()

const FISCAL_YEAR_STARTS = [
  { value: "01-01", label: "January 1 (Standard calendar year)" },
  { value: "04-01", label: "April 1 (Q2 fiscal start)" },
  { value: "07-01", label: "July 1 (Q3 fiscal start)" },
  { value: "10-01", label: "October 1 (Federal fiscal start)" },
]

type Profile = {
  id: string
  name: string
  slug: string
  logo: string | null
  businessType: string | null
  dotNumber: string | null
  mcNumber: string | null
  ein: string | null
  phone: string | null
  supportEmail: string | null
  website: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  defaultCurrency: string
  timeZone: string
  fiscalYearStart: string
  // Onboarding metadata fields
  fleetSize: string | null
  teamSize: string | null
  geographicScope: string | null
  currentTool: string | null
  freightTypes: string[]
  primaryGoals: string[]
  onboardingCompletedAt?: string | null
}

export function WorkspaceSettingsClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const activeOrg = useAuthStore((s) => s.activeOrganization)
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization)

  // Active section tab: 'profile' | 'operations' | 'compliance' | 'defaults'
  const [activeTab, setActiveTab] = useState<
    "profile" | "operations" | "compliance" | "defaults"
  >("profile")

  // ─── Auth + permission check ─────────────────────────────────────
  const [ready, setReady] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await authClient.getSession()
      if (cancelled) return
      if (!data?.user) {
        router.replace("/login")
        return
      }
      const { data: perm } = await authClient.organization.hasPermission({
        permissions: { workspace: ["update"] },
      })
      if (cancelled) return
      setCanEdit(!!perm?.success)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  // ─── Profile fetch ───────────────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ["workspace-profile", activeOrg?.id],
    queryFn: async () => {
      const r = await fetch("/api/settings/workspace-profile", {
        credentials: "include",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = (await r.json()) as { profile: Profile }
      return j.profile
    },
    enabled: !!activeOrg?.id,
    staleTime: 30_000,
  })

  // ─── Local form state ────────────────────────────────────────────
  const [form, setForm] = useState<Partial<Profile>>({})

  useEffect(() => {
    if (profileQuery.data) {
      const d = profileQuery.data
      setForm({
        name: d.name,
        slug: d.slug,
        logo: d.logo ?? null,
        businessType: d.businessType,
        dotNumber: d.dotNumber,
        mcNumber: d.mcNumber,
        ein: d.ein,
        phone: d.phone,
        supportEmail: d.supportEmail,
        website: d.website,
        addressLine1: d.addressLine1,
        addressLine2: d.addressLine2,
        city: d.city,
        state: d.state,
        postalCode: d.postalCode,
        country: d.country ?? "US",
        defaultCurrency: d.defaultCurrency || "USD",
        timeZone: d.timeZone || "America/Chicago",
        fiscalYearStart: d.fiscalYearStart || "01-01",
        fleetSize: d.fleetSize,
        teamSize: d.teamSize,
        geographicScope: d.geographicScope,
        currentTool: d.currentTool,
        freightTypes: d.freightTypes || [],
        primaryGoals: d.primaryGoals || [],
      })
    }
  }, [profileQuery.data])

  // ─── Slug availability check ─────────────────────────────────────
  const slugClean = (form.slug ?? "").trim().toLowerCase()
  const slugFormatValid = /^[a-z0-9-]{2,50}$/.test(slugClean)
  const slugChanged =
    !!profileQuery.data && slugClean !== (profileQuery.data.slug ?? "")

  const slugQuery = useQuery({
    queryKey: ["check-slug", slugClean, activeOrg?.id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.checkSlug({
        slug: slugClean,
      })
      if (error) throw new Error(error.code || "SLUG_CHECK_FAILED")
      return data
    },
    enabled: slugChanged && slugFormatValid && canEdit,
    staleTime: 10_000,
    retry: false,
  })

  const slugAvailable = slugChanged
    ? slugQuery.data
      ? (slugQuery.data as { status: boolean }).status === true
      : slugQuery.isError
      ? false
      : null
    : true

  // ─── Save mutation ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await updateWorkspaceProfileAction({
        logo: form.logo ?? null,
        name: form.name,
        slug: slugClean,
        businessType:
          (form.businessType as
            | "broker"
            | "carrier"
            | "shipper"
            | "3pl"
            | "other"
            | null) ?? null,
        dotNumber: form.dotNumber ?? null,
        mcNumber: form.mcNumber ?? null,
        ein: form.ein ?? null,
        phone: form.phone ?? null,
        supportEmail: form.supportEmail ?? null,
        website: form.website ?? null,
        addressLine1: form.addressLine1 ?? null,
        addressLine2: form.addressLine2 ?? null,
        city: form.city ?? null,
        state: form.state ?? null,
        postalCode: form.postalCode ?? null,
        country: form.country ?? "US",
        defaultCurrency: form.defaultCurrency ?? "USD",
        timeZone: form.timeZone ?? "America/Chicago",
        fiscalYearStart: form.fiscalYearStart ?? "01-01",
        fleetSize: form.fleetSize ?? null,
        teamSize: form.teamSize ?? null,
        geographicScope: form.geographicScope ?? null,
        currentTool: form.currentTool ?? null,
        freightTypes: form.freightTypes ?? [],
        primaryGoals: form.primaryGoals ?? [],
      } satisfies UpdateWorkspaceProfileInput)
    },
    onSuccess: (result) => {
      if (!result.ok) {
        if (result.error === "FORBIDDEN") {
          toast.error("You don't have permission to edit the workspace profile.")
        } else if (result.error === "VALIDATION_ERROR") {
          toast.error("Please fix the highlighted fields.")
        } else {
          toast.error(result.error)
        }
        return
      }
      toast.success("Workspace profile & operational settings saved")
      if (activeOrg && result.organization) {
        setActiveOrganization({
          ...activeOrg,
          name: result.organization.name,
          slug: result.organization.slug,
        })
      }
      queryClient.invalidateQueries({ queryKey: ["workspace-profile"] })
      router.refresh()
    },
    onError: (err) => {
      console.error("[WORKSPACE] save error:", err)
      toast.error("Failed to save workspace profile")
    },
  })

  // ─── Logo upload (S3 presigned PUT) ──────────────────────────────
  const [logoUploading, setLogoUploading] = useState(false)

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const presignRes = await fetch("/api/upload/logo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          contentLength: file.size,
        }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.message || `Upload failed (${presignRes.status})`)
      }
      const { uploadUrl, publicUrl } = await presignRes.json()

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`)

      return publicUrl as string
    },
    onSuccess: (url) => {
      update("logo", url)
      toast.success("Logo uploaded. Remember to save changes.")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  if (!ready || profileQuery.isLoading) {
    return (
      <div className="px-4 lg:px-8 py-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-brand-rule bg-brand-card p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-brand-accent mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-brand-ink">Failed to load workspace profile</p>
            <p className="text-xs text-brand-muted-soft mt-1">
              {(profileQuery.error as Error)?.message}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const profile = profileQuery.data!
  const update = (k: keyof Profile, v: any) =>
    setForm((s) => ({ ...s, [k]: v }))

  const toggleFreight = (id: string) => {
    const curr = form.freightTypes || []
    const next = curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
    update("freightTypes", next)
  }

  const toggleGoal = (goal: string) => {
    const curr = form.primaryGoals || []
    const next = curr.includes(goal)
      ? curr.filter((x) => x !== goal)
      : [...curr, goal]
    update("primaryGoals", next)
  }

  const dirty =
    JSON.stringify({
      ...form,
      slug: slugClean,
    }) !==
    JSON.stringify({
      name: profile.name,
      slug: profile.slug,
      logo: profile.logo,
      businessType: profile.businessType,
      dotNumber: profile.dotNumber,
      mcNumber: profile.mcNumber,
      ein: profile.ein,
      phone: profile.phone,
      supportEmail: profile.supportEmail,
      website: profile.website,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode,
      country: profile.country,
      defaultCurrency: profile.defaultCurrency,
      timeZone: profile.timeZone,
      fiscalYearStart: profile.fiscalYearStart,
      fleetSize: profile.fleetSize,
      teamSize: profile.teamSize,
      geographicScope: profile.geographicScope,
      currentTool: profile.currentTool,
      freightTypes: profile.freightTypes || [],
      primaryGoals: profile.primaryGoals || [],
    })

  const slugOk = !slugChanged || (slugFormatValid && slugAvailable === true)
  const canSave = dirty && canEdit && slugOk && !saveMutation.isPending

  const businessLabel =
    BUSINESS_TYPES.find((b) => b.value === form.businessType)?.label ||
    form.businessType ||
    "Carrier & Brokerage"

  const fleetLabel =
    FLEET_SIZES.find((f) => f.value === form.fleetSize)?.label ||
    (form.fleetSize ? `${form.fleetSize} trucks` : "Fleet Scale Pending")

  const scopeLabel =
    SCOPES.find((s) => s.value === form.geographicScope)?.label ||
    (form.geographicScope ? `${form.geographicScope} scope` : "National Corridors")

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 max-w-5xl mx-auto pb-24">
      {/* ─── Back to Settings ─── */}
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings Overview
        </Link>
        <Link
          href="/settings/audit"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-mono"
        >
          <History className="size-3.5 text-brand-accent" />
          View Profile Audit Log
        </Link>
      </div>

      {/* ─── Executive Workspace Header ─── */}
      <div className="rounded-2xl border border-brand-rule bg-brand-card p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar / Logo upload */}
            <div className="relative group shrink-0">
              <Avatar className="size-20 rounded-2xl border-2 border-brand-rule shadow-xs bg-brand-cream/60 overflow-hidden">
                <AvatarImage
                  src={form.logo ?? undefined}
                  alt={form.name ?? "Workspace"}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-2xl bg-brand-accent-tint text-brand-accent text-2xl font-serif font-bold">
                  {(form.name || "M").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => document.getElementById("header-logo-file")?.click()}
                  className="absolute inset-0 rounded-2xl bg-brand-ink/60 text-brand-cream flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium"
                >
                  <Upload className="size-4 mb-0.5" />
                  Change
                </button>
              )}
              <input
                id="header-logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setLogoUploading(true)
                    try {
                      await uploadLogoMutation.mutateAsync(file)
                    } finally {
                      setLogoUploading(false)
                      e.target.value = ""
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-ink truncate">
                  {form.name || "Workspace Profile"}
                </h1>
                <Badge className="bg-brand-accent-tint text-brand-accent border-brand-accent/20 text-xs font-mono">
                  /{slugClean}
                </Badge>
              </div>

              {/* FMCSA / USDOT Badge */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-brand-muted-soft font-mono">
                {form.dotNumber ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    USDOT #{form.dotNumber}
                  </span>
                ) : (
                  <span className="text-amber-700 font-sans text-[11px]">
                    • USDOT Pending Registration
                  </span>
                )}

                {form.mcNumber && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                    MC #{form.mcNumber}
                  </span>
                )}

                <span className="text-brand-muted-soft font-sans">• {businessLabel}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics from Onboarding */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-brand-rule">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-brand-rule bg-brand-cream/40 text-brand-ink text-xs font-sans gap-1.5">
                <Truck className="size-3 text-brand-accent" />
                {fleetLabel}
              </Badge>
              <Badge variant="outline" className="border-brand-rule bg-brand-cream/40 text-brand-ink text-xs font-sans gap-1.5">
                <Compass className="size-3 text-brand-accent" />
                {scopeLabel}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-brand-muted-soft font-mono">
              <span>Currency: {form.defaultCurrency}</span>
              <span>•</span>
              <span>TZ: {form.timeZone?.split("/")[1] || form.timeZone}</span>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-brand-rule overflow-x-auto">
          {[
            { id: "profile", label: "Company & Identity", icon: Building2 },
            { id: "operations", label: "Fleet & Operations", icon: Truck },
            { id: "compliance", label: "FMCSA & Regulatory", icon: ShieldCheck },
            { id: "defaults", label: "Financial & Regional", icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon
            const isSel = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  isSel
                    ? "bg-brand-ink text-brand-cream shadow-xs"
                    : "text-brand-ink/70 hover:bg-brand-cream/60 hover:text-brand-ink"
                )}
              >
                <Icon className={cn("size-3.5", isSel ? "text-brand-cream" : "text-brand-muted-soft")} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── TAB 1: Company & Identity ─── */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <Card className="border-brand-rule bg-brand-card p-6 space-y-6">
            <div>
              <h2 className="font-serif text-lg font-semibold text-brand-ink">
                Company Details & URL
              </h2>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                The public name and custom link for your TMS organization.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name" className="text-xs font-medium text-brand-ink">
                  Company Name (Legal Entity)
                </Label>
                <Input
                  id="ws-name"
                  value={form.name ?? ""}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Blue Ridge Freight LLC"
                  disabled={!canEdit}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-slug" className="text-xs font-medium text-brand-ink">
                  Workspace Slug URL
                </Label>
                <div className="flex items-center rounded-lg border border-brand-rule bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-accent/20 focus-within:border-brand-accent h-9">
                  <span className="px-2.5 text-[11px] text-brand-muted-soft font-mono bg-brand-cream border-r border-brand-rule h-full flex items-center shrink-0">
                    muvx.com/
                  </span>
                  <input
                    id="ws-slug"
                    value={form.slug ?? ""}
                    onChange={(e) =>
                      update(
                        "slug",
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="blue-ridge"
                    disabled={!canEdit}
                    className="flex-1 h-full px-2.5 text-xs bg-transparent outline-none placeholder:text-brand-muted-soft/60 font-mono disabled:opacity-60"
                  />
                </div>
                {slugChanged && (
                  <div className="text-[11px] mt-1">
                    {!slugFormatValid ? (
                      <span className="text-rose-600">
                        Use lowercase letters, numbers, and hyphens (2–50 chars).
                      </span>
                    ) : slugQuery.isFetching ? (
                      <span className="text-brand-muted-soft">Checking availability…</span>
                    ) : slugAvailable === true ? (
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <Check className="size-3" /> Available URL
                      </span>
                    ) : (
                      <span className="text-rose-600">✗ This URL is already taken.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-type" className="text-xs font-medium text-brand-ink">
                  Primary Business Model
                </Label>
                <Select
                  value={form.businessType ?? "carrier"}
                  onValueChange={(v) => update("businessType", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="ws-type" className="h-9 text-xs">
                    <SelectValue placeholder="Select business model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-phone" className="text-xs font-medium text-brand-ink">
                  Dispatch Phone Number
                </Label>
                <Input
                  id="ws-phone"
                  value={form.phone ?? ""}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  disabled={!canEdit}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-email" className="text-xs font-medium text-brand-ink">
                  Support / Rate Con Email
                </Label>
                <Input
                  id="ws-email"
                  type="email"
                  value={form.supportEmail ?? ""}
                  onChange={(e) => update("supportEmail", e.target.value)}
                  placeholder="dispatch@company.com"
                  disabled={!canEdit}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-web" className="text-xs font-medium text-brand-ink">
                Company Website
              </Label>
              <Input
                id="ws-web"
                value={form.website ?? ""}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://www.company.com"
                disabled={!canEdit}
                className="h-9 text-xs font-mono"
              />
            </div>
          </Card>

          {/* Headquarters Physical Address */}
          <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-brand-ink">
                Headquarters & Physical Address
              </h2>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                Official operating terminal for FMCSA filing, customer invoices, and legal notices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="addr1" className="text-xs font-medium text-brand-ink">
                  Street Address
                </Label>
                <Input
                  id="addr1"
                  value={form.addressLine1 ?? ""}
                  onChange={(e) => update("addressLine1", e.target.value)}
                  placeholder="450 Logistics Parkway"
                  disabled={!canEdit}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addr2" className="text-xs font-medium text-brand-ink">
                  Suite / Unit / Building
                </Label>
                <Input
                  id="addr2"
                  value={form.addressLine2 ?? ""}
                  onChange={(e) => update("addressLine2", e.target.value)}
                  placeholder="Suite 300"
                  disabled={!canEdit}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-medium text-brand-ink">
                  City
                </Label>
                <Input
                  id="city"
                  value={form.city ?? ""}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Atlanta"
                  disabled={!canEdit}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-medium text-brand-ink">
                  State / Province
                </Label>
                <Input
                  id="state"
                  value={form.state ?? ""}
                  onChange={(e) => update("state", e.target.value)}
                  placeholder="GA"
                  disabled={!canEdit}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zip" className="text-xs font-medium text-brand-ink">
                  Postal / ZIP Code
                </Label>
                <Input
                  id="zip"
                  value={form.postalCode ?? ""}
                  onChange={(e) => update("postalCode", e.target.value)}
                  placeholder="30301"
                  disabled={!canEdit}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-medium text-brand-ink">
                  Country
                </Label>
                <Select
                  value={form.country ?? "US"}
                  onValueChange={(v) => update("country", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="country" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {DYNAMIC_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: Fleet & Operations (THE ONBOARDING DATA!) ─── */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          {/* Scale & Scope Card */}
          <Card className="border-brand-rule bg-brand-card p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-brand-accent" />
                <h2 className="font-serif text-lg font-semibold text-brand-ink">
                  Fleet Capacity & Operating Scope
                </h2>
              </div>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                Originally calibrated during workspace onboarding. Keep these updated as your fleet scales to optimize dispatch algorithms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Fleet Size (Active Power Units)
                </Label>
                <Select
                  value={form.fleetSize ?? "6-20"}
                  onValueChange={(v) => update("fleetSize", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select fleet scale..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FLEET_SIZES.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Team Headcount
                </Label>
                <Select
                  value={form.teamSize ?? "2-5"}
                  onValueChange={(v) => update("teamSize", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select team size..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Geographic Operating Scope
                </Label>
                <Select
                  value={form.geographicScope ?? "national"}
                  onValueChange={(v) => update("geographicScope", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select geographic reach..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Primary Dispatch System Origin
                </Label>
                <Select
                  value={form.currentTool ?? "spreadsheet"}
                  onValueChange={(v) => update("currentTool", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Prior software system..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOLS.map((tool) => (
                      <SelectItem key={tool.value} value={tool.value} className="text-xs">
                        {tool.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Freight Equipment Specialization */}
          <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Package className="size-4 text-brand-accent" />
                <h2 className="font-serif text-lg font-semibold text-brand-ink">
                  Equipment & Trailer Capabilities
                </h2>
              </div>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                Select all trailer types your fleet operates or brokers. Informs load matching and rate estimations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {FREIGHT_TYPES.map((ft) => {
                const isSelected = (form.freightTypes || []).includes(ft.id)
                return (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => canEdit && toggleFreight(ft.id)}
                    disabled={!canEdit}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1",
                      isSelected
                        ? "bg-brand-accent-tint/60 border-brand-accent/40 shadow-xs"
                        : "bg-brand-cream/30 border-brand-rule hover:bg-brand-cream/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-brand-ink">
                        {ft.label}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="size-4 text-brand-accent shrink-0" />
                      ) : (
                        <div className="size-4 rounded-full border border-brand-rule shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-brand-muted-soft">
                      {ft.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Strategic Goals */}
          <Card className="border-brand-rule bg-brand-card p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="size-4 text-brand-accent" />
                <h2 className="font-serif text-lg font-semibold text-brand-ink">
                  Strategic Workspace Priorities
                </h2>
              </div>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                Tailors Muvx Copilot alerts, dashboard widgets, and automation triggers to what matters most.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {STRATEGIC_GOALS.map((goal) => {
                const isSelected = (form.primaryGoals || []).includes(goal)
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => canEdit && toggleGoal(goal)}
                    disabled={!canEdit}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2",
                      isSelected
                        ? "bg-brand-ink text-brand-cream border-brand-ink shadow-xs"
                        : "bg-brand-cream/40 border-brand-rule text-brand-ink/80 hover:bg-brand-cream/80"
                    )}
                  >
                    {isSelected && <Check className="size-3 text-brand-cream" />}
                    {goal}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: FMCSA & Regulatory ─── */}
      {activeTab === "compliance" && (
        <div className="space-y-6">
          <Card className="border-brand-rule bg-brand-card p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-accent" />
                <h2 className="font-serif text-lg font-semibold text-brand-ink">
                  FMCSA Credentials & Tax Identifiers
                </h2>
              </div>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                Required for US Federal Motor Carrier Safety Administration compliance, rate confirmations, and billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dot-no" className="text-xs font-medium text-brand-ink">
                  USDOT Number
                </Label>
                <Input
                  id="dot-no"
                  value={form.dotNumber ?? ""}
                  onChange={(e) => update("dotNumber", e.target.value)}
                  placeholder="e.g. 3849102"
                  disabled={!canEdit}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-brand-muted-soft">
                  7-digit identification issued by FMCSA.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mc-no" className="text-xs font-medium text-brand-ink">
                  MC / FF Operating Authority #
                </Label>
                <Input
                  id="mc-no"
                  value={form.mcNumber ?? ""}
                  onChange={(e) => update("mcNumber", e.target.value)}
                  placeholder="e.g. MC-987654"
                  disabled={!canEdit}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-brand-muted-soft">
                  Interstate freight operating authority.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ein-no" className="text-xs font-medium text-brand-ink">
                  Federal Tax ID (EIN)
                </Label>
                <Input
                  id="ein-no"
                  value={form.ein ?? ""}
                  onChange={(e) => update("ein", e.target.value)}
                  placeholder="12-3456789"
                  disabled={!canEdit}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-brand-muted-soft">
                  IRS Employer Identification Number for W-9.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-start gap-3">
              <Info className="size-4 text-blue-700 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <span className="font-semibold">Automated Document Generation:</span> Updating your USDOT, MC, and EIN credentials will immediately reflect across all generated PDF Bills of Lading, Rate Confirmations, Carrier Packets, and Customer Invoices.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: Financial & Regional Defaults ─── */}
      {activeTab === "defaults" && (
        <div className="space-y-6">
          <Card className="border-brand-rule bg-brand-card p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-brand-accent" />
                <h2 className="font-serif text-lg font-semibold text-brand-ink">
                  Accounting Currency & Timezone Defaults
                </h2>
              </div>
              <p className="text-xs text-brand-muted-soft mt-0.5">
                Standardizes timestamps, driver HOS cycles, settlement calculations, and fiscal reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Default Accounting Currency
                </Label>
                <Select
                  value={form.defaultCurrency ?? "USD"}
                  onValueChange={(v) => update("defaultCurrency", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {DYNAMIC_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Dispatch Operational Time Zone
                </Label>
                <Select
                  value={form.timeZone ?? "America/Chicago"}
                  onValueChange={(v) => update("timeZone", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {DYNAMIC_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.id} value={tz.id} className="text-xs">
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-brand-ink">
                  Fiscal Year Starting Date
                </Label>
                <Select
                  value={form.fiscalYearStart ?? "01-01"}
                  onValueChange={(v) => update("fiscalYearStart", v)}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {FISCAL_YEAR_STARTS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Sticky Bottom Action Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-brand-card/95 backdrop-blur-md border-t border-brand-rule p-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-brand-muted-soft">
            {canEdit ? (
              <>
                <Badge variant="outline" className="border-brand-rule font-mono text-[10px]">
                  AUDIT LOGGED
                </Badge>
                <span className="hidden sm:inline">
                  All changes are timestamped and preserved in the workspace audit ledger.
                </span>
              </>
            ) : (
              <span className="text-amber-800 flex items-center gap-1 font-medium">
                <Lock className="size-3" /> Read-only mode — Administrator privileges required to modify.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (profileQuery.data) {
                    const d = profileQuery.data
                    setForm({
                      name: d.name,
                      slug: d.slug,
                      logo: d.logo ?? null,
                      businessType: d.businessType,
                      dotNumber: d.dotNumber,
                      mcNumber: d.mcNumber,
                      ein: d.ein,
                      phone: d.phone,
                      supportEmail: d.supportEmail,
                      website: d.website,
                      addressLine1: d.addressLine1,
                      addressLine2: d.addressLine2,
                      city: d.city,
                      state: d.state,
                      postalCode: d.postalCode,
                      country: d.country ?? "US",
                      defaultCurrency: d.defaultCurrency || "USD",
                      timeZone: d.timeZone || "America/Chicago",
                      fiscalYearStart: d.fiscalYearStart || "01-01",
                      fleetSize: d.fleetSize,
                      teamSize: d.teamSize,
                      geographicScope: d.geographicScope,
                      currentTool: d.currentTool,
                      freightTypes: d.freightTypes || [],
                      primaryGoals: d.primaryGoals || [],
                    })
                  }
                }}
                disabled={saveMutation.isPending}
                className="h-9 text-xs text-brand-muted-soft hover:text-brand-ink"
              >
                Reset
              </Button>
            )}

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave}
              className="h-9 px-5 text-xs bg-brand-ink hover:bg-brand-ink/90 text-brand-cream shadow-xs font-medium"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving Changes…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
