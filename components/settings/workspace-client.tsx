"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { updateWorkspaceProfileAction, type UpdateWorkspaceProfileInput } from "@/app/actions/workspace"
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
import { Loader2, Building2, Check, AlertCircle, Lock, Upload, X } from "lucide-react"
import { toast } from "sonner"

// ─── Phase 3 — workspace profile (WS-09, WS-10, WS-14) ──────────────────────
// Owner/admin can edit business type, regulatory IDs, contact, and ops
// defaults. Non-admins see the same form as read-only (the "read" scope
// is included on every role; the server action enforces "update" for
// owner + admin only).

const BUSINESS_TYPES = [
  { value: "broker", label: "Broker" },
  { value: "carrier", label: "Carrier" },
  { value: "shipper", label: "Shipper" },
  { value: "3pl", label: "3PL" },
  { value: "other", label: "Other" },
]

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "MXN", label: "MXN — Mexican Peso" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
]

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "UTC",
]

const FISCAL_YEAR_STARTS = [
  { value: "01-01", label: "January 1 (Calendar year)" },
  { value: "04-01", label: "April 1" },
  { value: "07-01", label: "July 1" },
  { value: "10-01", label: "October 1" },
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
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  defaultCurrency: string
  timeZone: string
  fiscalYearStart: string
}

export function WorkspaceSettingsClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const activeOrg = useAuthStore((s) => s.activeOrganization)
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization)

  // ─── Auth + permission check (client-side only) ───────────────────
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
      // Read effective role for the active org from the BA session.
      // The `role` field on user is the platform role id (user|admin).
      // The per-workspace role lives on `member.role`; we don't need it
      // for the canEdit gate — BA's hasPermission is the real check.
      const platformRole = (data?.user as { role?: string } | null)?.role ?? "user"
      // Fall back to checking via BA's hasPermission (server-authoritative).
      // We don't trust the role string on its own; the server action is the
      // real gate. But we can hide inputs in the UI for a smoother UX.
      const { data: perm } = await authClient.organization.hasPermission({
        permissions: { workspace: ["update"] },
      })
      if (cancelled) return
      setCanEdit(!!perm?.success)
      console.log(
        "[WORKSPACE] ready; role=",
        platformRole,
        " canEdit=",
        !!perm?.success,
      )
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  // ─── Profile fetch ────────────────────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ["workspace-profile", activeOrg?.id],
    queryFn: async () => {
      const r = await fetch("/api/settings/workspace-profile", {
        credentials: "include",
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = (await r.json()) as { profile: Profile }
      console.log("[WORKSPACE] profile loaded:", j.profile)
      return j.profile
    },
    enabled: !!activeOrg?.id,
    staleTime: 30_000,
  })

  // ─── Local form state ────────────────────────────────────────────
  const [form, setForm] = useState<Partial<Profile>>({})
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profileQuery.data) {
      setForm({
        name: profileQuery.data.name,
        slug: profileQuery.data.slug,
        logo: profileQuery.data.logo ?? null,
        businessType: profileQuery.data.businessType,
        dotNumber: profileQuery.data.dotNumber,
        mcNumber: profileQuery.data.mcNumber,
        ein: profileQuery.data.ein,
        phone: profileQuery.data.phone,
        addressLine1: profileQuery.data.addressLine1,
        addressLine2: profileQuery.data.addressLine2,
        city: profileQuery.data.city,
        state: profileQuery.data.state,
        postalCode: profileQuery.data.postalCode,
        country: profileQuery.data.country ?? "US",
        defaultCurrency: profileQuery.data.defaultCurrency,
        timeZone: profileQuery.data.timeZone,
        fiscalYearStart: profileQuery.data.fiscalYearStart,
      })
    }
  }, [profileQuery.data])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Slug availability check (only when user types a new slug) ───
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
      console.log("[WORKSPACE] save →", form)
      return await updateWorkspaceProfileAction({
        logo: form.logo ?? null,
        name: form.name,
        slug: slugClean,
        businessType: (form.businessType as "broker" | "carrier" | "shipper" | "3pl" | "other" | null) ?? null,
        dotNumber: form.dotNumber ?? null,
        mcNumber: form.mcNumber ?? null,
        ein: form.ein ?? null,
        phone: form.phone ?? null,
        addressLine1: form.addressLine1 ?? null,
        addressLine2: form.addressLine2 ?? null,
        city: form.city ?? null,
        state: form.state ?? null,
        postalCode: form.postalCode ?? null,
        country: form.country ?? "US",
        defaultCurrency: form.defaultCurrency ?? "USD",
        timeZone: form.timeZone ?? "America/Chicago",
        fiscalYearStart: form.fiscalYearStart ?? "01-01",
      } satisfies UpdateWorkspaceProfileInput)
    },
    onSuccess: (result) => {
      console.log("[WORKSPACE] save result:", result)
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
      toast.success("Workspace profile updated")
      // Sync auth store with new name/slug
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
  const [logoRemoving, setLogoRemoving] = useState(false)

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log(`[WORKSPACE] Logo upload: ${file.name} (${file.size} bytes, ${file.type})`)

      // 1. Get presigned URL from server (server checks tenant + permission)
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

      // 2. Upload directly to S3 (server never touches the file bytes)
      console.log("[WORKSPACE] Uploading to S3:", { uploadUrl: uploadUrl.substring(0, 100), contentType: file.type, size: file.size })
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      const putText = await putRes.text().catch(() => "no body")
      console.log("[WORKSPACE] S3 response:", { status: putRes.status, body: putText.substring(0, 500) })
      if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status}): ${putText.substring(0, 200)}`)

      console.log("[WORKSPACE] Logo uploaded to S3:", publicUrl)
      return publicUrl as string
    },
    onSuccess: (url) => {
      update("logo", url)
      toast.success("Logo uploaded. Click Save to apply.")
    },
    onError: (err: Error) => {
      console.error("[WORKSPACE] Logo upload failed:", err)
      toast.error(err.message)
    },
  })

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      if (!form.logo) return
      // Extract the S3 key from the URL to delete
      setLogoRemoving(true)
      // The delete endpoint is admin-only; for now we just clear the field
      // and let Save persist the null
      update("logo", null)
    },
  })

  if (!ready || profileQuery.isLoading) {
    return (
      <div className="p-4 lg:p-8 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-brand-rule bg-brand-card p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-brand-accent mt-0.5" />
          <div>
            <p className="font-medium">Failed to load workspace profile</p>
            <p className="text-sm text-brand-muted-soft mt-1">
              {(profileQuery.error as Error)?.message}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const profile = profileQuery.data!
  const update = (k: keyof Profile, v: string | null) =>
    setForm((s) => ({ ...s, [k]: v }))

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
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      postalCode: profile.postalCode,
      country: profile.country,
      defaultCurrency: profile.defaultCurrency,
      timeZone: profile.timeZone,
      fiscalYearStart: profile.fiscalYearStart,
    })

  const slugOk = !slugChanged || (slugFormatValid && slugAvailable === true)
  const canSave = dirty && canEdit && slugOk && !saveMutation.isPending

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Building2 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Workspace</span> profile
          </h1>
        </div>
        <p className="text-sm text-brand-ink/80">
          Company details, regulatory identifiers, and operational defaults.
          {canEdit ? (
            " Changes are visible to your team immediately and recorded in the audit log."
          ) : (
            <span className="inline-flex items-center gap-1.5 ml-1">
              <Lock className="h-3 w-3" />
              You have read-only access.
            </span>
          )}
        </p>
      </div>

      {/* ─── Identity ─────────────────────────────────────────── */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-5">
        <div>
          <h2 className="font-serif text-xl text-brand-ink">Identity</h2>
          <p className="text-xs text-brand-muted-soft mt-1">
            How your workspace appears to the team and on invoices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Workspace name</Label>
            <Input
              id="org-name"
              value={form.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Acme Logistics"
              disabled={!canEdit}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Workspace URL</Label>
            <div className="flex items-center rounded-lg border border-brand-rule bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-accent/20 focus-within:border-brand-accent">
              <span className="px-3 text-xs text-brand-muted-soft font-mono tracking-tight bg-brand-cream border-r border-brand-rule h-10 flex items-center">
                muvx.com/
              </span>
              <input
                id="org-slug"
                value={form.slug ?? ""}
                onChange={(e) => {
                  update(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }}
                placeholder="acme-logistics"
                disabled={!canEdit}
                className="flex-1 h-10 px-3 text-sm bg-transparent outline-none placeholder:text-brand-muted-soft/60 disabled:opacity-60"
              />
            </div>
            <div className="min-h-[20px] text-xs">
              {canEdit && slugChanged && !slugFormatValid && (form.slug ?? "").length > 0 && (
                <p className="text-brand-accent">
                  Use lowercase letters, numbers, and hyphens only.
                </p>
              )}
              {canEdit && slugChanged && slugFormatValid && slugQuery.isFetching && (
                <p className="text-brand-muted-soft">Checking availability…</p>
              )}
              {canEdit && slugChanged && slugFormatValid && slugAvailable === true && (
                <p className="text-emerald-700 flex items-center gap-1">
                  <Check className="h-3 w-3" /> This URL is available.
                </p>
              )}
              {canEdit && slugChanged && (slugAvailable === false || slugQuery.isError) && (
                <p className="text-brand-accent">✗ This URL is already taken.</p>
              )}
            </div>
          </div> {/* workspace name / slug row */}
        </div> {/* grid-cols-1 md:grid-cols-2 */}

        <Separator className="bg-brand-rule" />

        {/* ── Logo ── */}
        <div className="space-y-3">
          <Label>Workspace logo</Label>
          <div className="flex items-start gap-6">
            {form.logo ? (
              <Avatar className="size-24 border border-brand-rule">
                <AvatarImage
                  src={form.logo}
                  alt={form.name ?? "Workspace logo"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-brand-cream text-brand-muted-soft">
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-24 rounded-xl border-2 border-dashed border-brand-rule bg-brand-cream flex items-center justify-center">
                <Building2 className="h-8 w-8 text-brand-muted-soft" />
              </div>
            )}

            <div className="space-y-2">
              {form.logo && canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    update("logo", null)
                    toast.info("Logo will be removed on save.")
                  }}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
              {canEdit && !form.logo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={logoUploading}
                  className="h-8"
                >
                  {logoUploading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 mr-1" /> Upload
                    </>
                  )}
                </Button>
              )}
              {!canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled
                  className="h-8"
                >
                  <Upload className="h-3 w-3 mr-1" /> Upload
                </Button>
              )}
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (!canEdit) {
                    toast.error("You don't have permission to upload a logo.")
                    return
                  }
                  await uploadLogoMutation.mutateAsync(file)
                  e.target.value = ""
                }}
                className="hidden"
              />
              <p className="text-xs text-brand-muted-soft max-w-xs">
                PNG, JPG, WebP, or GIF. Max 5 MB. Will appear on invoices and
                the sidebar.
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-brand-rule" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessType">Business type</Label>
            <Select
              value={form.businessType ?? ""}
              onValueChange={(v) => update("businessType", v || null)}
              disabled={!canEdit}
            >
              <SelectTrigger id="businessType" className="h-10">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value || null)}
              placeholder="+1 555 123 4567"
              disabled={!canEdit}
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dotNumber">DOT #</Label>
            <Input
              id="dotNumber"
              value={form.dotNumber ?? ""}
              onChange={(e) => update("dotNumber", e.target.value || null)}
              placeholder="1234567"
              maxLength={20}
              disabled={!canEdit}
              className="h-10 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcNumber">MC #</Label>
            <Input
              id="mcNumber"
              value={form.mcNumber ?? ""}
              onChange={(e) => update("mcNumber", e.target.value || null)}
              placeholder="MC-123456"
              maxLength={20}
              disabled={!canEdit}
              className="h-10 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ein">EIN</Label>
            <Input
              id="ein"
              value={form.ein ?? ""}
              onChange={(e) => update("ein", e.target.value || null)}
              placeholder="12-3456789"
              maxLength={20}
              disabled={!canEdit}
              className="h-10 font-mono"
            />
          </div>
        </div>
      </Card>

      {/* ─── Address ──────────────────────────────────────────── */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-5">
        <div>
          <h2 className="font-serif text-xl text-brand-ink">Address</h2>
          <p className="text-xs text-brand-muted-soft mt-1">
            Mailing address for invoices and regulatory correspondence.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input
            id="addressLine1"
            value={form.addressLine1 ?? ""}
            onChange={(e) => update("addressLine1", e.target.value || null)}
            placeholder="123 Main St"
            maxLength={200}
            disabled={!canEdit}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input
            id="addressLine2"
            value={form.addressLine2 ?? ""}
            onChange={(e) => update("addressLine2", e.target.value || null)}
            placeholder="Suite 200"
            maxLength={200}
            disabled={!canEdit}
            className="h-10"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2 md:col-span-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city ?? ""}
              onChange={(e) => update("city", e.target.value || null)}
              placeholder="Springfield"
              maxLength={100}
              disabled={!canEdit}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State / Province</Label>
            <Input
              id="state"
              value={form.state ?? ""}
              onChange={(e) => update("state", e.target.value || null)}
              placeholder="IL"
              maxLength={50}
              disabled={!canEdit}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input
              id="postalCode"
              value={form.postalCode ?? ""}
              onChange={(e) => update("postalCode", e.target.value || null)}
              placeholder="62704"
              maxLength={20}
              disabled={!canEdit}
              className="h-10 font-mono"
            />
          </div>
        </div>
        <div className="space-y-1.5 max-w-[10rem]">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={form.country ?? "US"}
            onChange={(e) =>
              update("country", e.target.value.toUpperCase().slice(0, 2) || "US")
            }
            maxLength={2}
            disabled={!canEdit}
            className="h-10 font-mono uppercase"
          />
        </div>
      </Card>

      {/* ─── Operations ─────────────────────────────────────── */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-5">
        <div>
          <h2 className="font-serif text-xl text-brand-ink">Operations</h2>
          <p className="text-xs text-brand-muted-soft mt-1">
            Defaults used by the rest of the workspace (invoices, payroll,
            scheduling).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="defaultCurrency">Default currency</Label>
            <Select
              value={form.defaultCurrency ?? "USD"}
              onValueChange={(v) => update("defaultCurrency", v)}
              disabled={!canEdit}
            >
              <SelectTrigger id="defaultCurrency" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timeZone">Time zone</Label>
            <Select
              value={form.timeZone ?? "America/Chicago"}
              onValueChange={(v) => update("timeZone", v)}
              disabled={!canEdit}
            >
              <SelectTrigger id="timeZone" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fiscalYearStart">Fiscal year start</Label>
            <Select
              value={form.fiscalYearStart ?? "01-01"}
              onValueChange={(v) => update("fiscalYearStart", v)}
              disabled={!canEdit}
            >
              <SelectTrigger id="fiscalYearStart" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FISCAL_YEAR_STARTS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ─── Save ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-brand-muted-soft">
          {canEdit ? (
            <>
              <Badge
                variant="outline"
                className="border-brand-rule text-brand-muted-soft mr-2"
              >
                audit logged
              </Badge>
              All changes are recorded in the workspace audit log.
            </>
          ) : (
            <>Read-only — only owners and admins can edit the profile.</>
          )}
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave}
          className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  )
}
