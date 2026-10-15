"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Building2, Check, AlertCircle, Lock, Upload, X } from "lucide-react"
import { toast } from "sonner"
import {
  getEditableFieldSet,
  type WorkspaceField,
  type RoleId,
} from "@/lib/auth-roles"

// ─── Phase 3 — workspace profile (WS-09, WS-10, WS-14) ──────────────────────
// Owner/admin can edit business type, regulatory IDs, contact, and ops
// defaults. Non-admins see the same form as read-only (the "read" scope
// is included on every role; the server action enforces "update" for
// owner + admin only).
//
// Field-level edit gates are enforced both:
//   1. Client — `disabled` prop via `canEditField()` + `editableFields` Set
//   2. Server — `updateWorkspaceProfileAction` rejects fields the org role
//      cannot edit with FORBIDDEN + fieldErrors.

// ─── Zod schema ( mirrors the server-side profileSchema ) ───────────────────

const businessTypeEnum = z.enum([
  "broker",
  "carrier",
  "shipper",
  "3pl",
  "other",
])

const profileFormSchema = z.object({
  name:           z.string().min(2).max(100).optional(),
  slug:           z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens").optional(),
  businessType:   businessTypeEnum.nullable().optional(),
  dotNumber:      z.string().max(20).regex(/^[A-Za-z0-9-]*$/, "DOT# must be alphanumeric").nullable().optional().or(z.literal("").transform(() => null)),
  mcNumber:       z.string().max(20).regex(/^[A-Za-z0-9-]*$/, "MC# must be alphanumeric").nullable().optional().or(z.literal("").transform(() => null)),
  ein:            z.string().max(20).regex(/^[0-9-]*$/, "EIN must be digits with optional dash").nullable().optional().or(z.literal("").transform(() => null)),
  phone:          z.string().max(30).regex(/^[+()0-9 -]*$/, "Phone has invalid characters").nullable().optional().or(z.literal("").transform(() => null)),
  addressLine1:   z.string().max(200).nullable().optional(),
  addressLine2:   z.string().max(200).nullable().optional(),
  city:           z.string().max(100).nullable().optional(),
  state:          z.string().max(50).nullable().optional(),
  postalCode:     z.string().max(20).regex(/^[A-Za-z0-9 -]*$/, "Postal code has invalid characters").nullable().optional().or(z.literal("").transform(() => null)),
  country:        z.string().max(2).default("US"),
  defaultCurrency:z.string().length(3).regex(/^[A-Z]{3}$/, "Currency must be uppercase letters").default("USD"),
  timeZone:       z.string().min(1).max(60).default("America/Chicago"),
  fiscalYearStart:z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, "Must be MM-DD").default("01-01"),
  logo:           z.string().url("Logo must be a valid URL").max(2048).nullable().optional().or(z.literal("").transform(() => null)),
})

export type ProfileFormValues = z.input<typeof profileFormSchema>

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

export function WorkspaceSettingsClient() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const activeOrg = useAuthStore((s) => s.activeOrganization)
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization)

  // ─── react-hook-form setup ───────────────────────────────────────
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo: null,
      businessType: undefined,
      dotNumber: null,
      mcNumber: null,
      ein: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: "US",
      defaultCurrency: "USD",
      timeZone: "America/Chicago",
      fiscalYearStart: "01-01",
    },
    mode: "onBlur",
  })

  // ─── Auth + permission check (client-side only) ───────────────────
  // orgRoleId drives field-level canEdit; editableFields is a Set for O(1) lookup
  const [orgRoleId, setOrgRoleId] = useState<RoleId>("member")
  const [ready, setReady] = useState(false)

  const editableFields = useMemo(
    () => getEditableFieldSet(orgRoleId),
    [orgRoleId],
  )

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
      if (!perm?.success) {
        // Not owner/admin — still ready but with read-only view
        setReady(true)
        return
      }
      // Owner/admin: also resolve the org role for field-level gates
      // orgRoleId comes from the session membership; fall back to "admin"
      const sessionRole = (data.user as { role?: string } | null)?.role ?? "admin"
      setOrgRoleId(sessionRole as RoleId)
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
      const j = (await r.json()) as { profile: z.infer<typeof profileFormSchema> & { id: string } }
      console.log("[WORKSPACE] profile loaded:", j.profile)
      return j.profile
    },
    enabled: !!activeOrg?.id,
    staleTime: 30_000,
  })

  // ─── Pre-populate form when profile loads ─────────────────────────
  useEffect(() => {
    if (!profileQuery.data) return
    const p = profileQuery.data
    form.reset({
      name: p.name ?? "",
      slug: p.slug ?? "",
      logo: p.logo ?? null,
      businessType: p.businessType as z.infer<typeof businessTypeEnum> ?? undefined,
      dotNumber: p.dotNumber ?? null,
      mcNumber: p.mcNumber ?? null,
      ein: p.ein ?? null,
      phone: p.phone ?? null,
      addressLine1: p.addressLine1 ?? null,
      addressLine2: p.addressLine2 ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      postalCode: p.postalCode ?? null,
      country: p.country ?? "US",
      defaultCurrency: p.defaultCurrency ?? "USD",
      timeZone: p.timeZone ?? "America/Chicago",
      fiscalYearStart: p.fiscalYearStart ?? "01-01",
    })
  }, [profileQuery.data, form])

  // ─── Slug availability check ─────────────────────────────────────
  const slugWatch = form.watch("slug") ?? ""
  const slugClean = slugWatch.trim().toLowerCase()
  const slugFormatValid = /^[a-z0-9-]{2,50}$/.test(slugClean)
  const slugChanged = !!profileQuery.data && slugClean !== (profileQuery.data.slug ?? "")
  const slugQuery = useQuery({
    queryKey: ["check-slug", slugClean, activeOrg?.id],
    queryFn: async () => {
      const { data, error } = await authClient.organization.checkSlug({
        slug: slugClean,
      })
      if (error) throw new Error(error.code || "SLUG_CHECK_FAILED")
      return data
    },
    enabled: slugChanged && slugFormatValid && editableFields.has("slug"),
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
    mutationFn: async (values: ProfileFormValues) => {
      console.log("[WORKSPACE] save →", values)
      return await updateWorkspaceProfileAction({
        logo: values.logo ?? null,
        name: values.name,
        slug: slugClean,
        businessType: values.businessType ?? null,
        dotNumber: values.dotNumber ?? null,
        mcNumber: values.mcNumber ?? null,
        ein: values.ein ?? null,
        phone: values.phone ?? null,
        addressLine1: values.addressLine1 ?? null,
        addressLine2: values.addressLine2 ?? null,
        city: values.city ?? null,
        state: values.state ?? null,
        postalCode: values.postalCode ?? null,
        country: values.country ?? "US",
        defaultCurrency: values.defaultCurrency ?? "USD",
        timeZone: values.timeZone ?? "America/Chicago",
        fiscalYearStart: values.fiscalYearStart ?? "01-01",
      } satisfies UpdateWorkspaceProfileInput)
    },
    onSuccess: (result) => {
      console.log("[WORKSPACE] save result:", result)
      if (!result.ok) {
        if (result.error === "FORBIDDEN") {
          toast.error("You don't have permission to edit one or more fields.")
        } else if (result.error === "VALIDATION_ERROR") {
          toast.error("Please fix the highlighted fields.")
        } else {
          toast.error(result.error)
        }
        return
      }
      toast.success("Workspace profile updated")
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
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log(`[WORKSPACE] Logo upload: ${file.name} (${file.size} bytes, ${file.type})`)

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
      form.setValue("logo", url)
      toast.success("Logo uploaded. Click Save to apply.")
    },
    onError: (err: Error) => {
      console.error("[WORKSPACE] Logo upload failed:", err)
      toast.error(err.message)
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
  const slugOk = !slugChanged || (slugFormatValid && slugAvailable === true)
  const canSave = form.formState.isDirty && slugOk && !saveMutation.isPending

  const isOwnerAdmin = editableFields.has("name")

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Building2 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Organization <span className="italic text-brand-accent">settings</span>
          </h1>
        </div>
        <p className="text-sm text-brand-ink/80">
          {isOwnerAdmin
            ? "Manage your organization's profile, regulatory IDs, and operational defaults."
            : "You have read-only access. Contact an admin to request changes."}
        </p>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="bg-brand-cream border border-brand-rule flex-wrap h-auto gap-1">
          <TabsTrigger value="identity" className="text-xs data-[state=active]:bg-brand-accent data-[state=active]:text-brand-ink">
            Identity
          </TabsTrigger>
          <TabsTrigger value="address" className="text-xs data-[state=active]:bg-brand-accent data-[state=active]:text-brand-ink">
            Address
          </TabsTrigger>
          <TabsTrigger value="operations" className="text-xs data-[state=active]:bg-brand-accent data-[state=active]:text-brand-ink">
            Operations
          </TabsTrigger>
        </TabsList>

        {/* ─── Identity tab ──────────────────────────────────── */}
        <TabsContent value="identity" className="mt-4 space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Workspace name */}
          <div className="space-y-1.5">
            <Label htmlFor="org-name">
              Workspace name
              {!editableFields.has("name") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="name"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="org-name"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                  placeholder="Acme Logistics"
                  disabled={!editableFields.has("name")}
                  className="h-10"
                />
              )}
            />
          </div>
          {/* Workspace slug */}
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">
              Workspace URL
              {!editableFields.has("slug") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="slug"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center rounded-lg border border-brand-rule bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-accent/20 focus-within:border-brand-accent">
                  <span className="px-3 text-xs text-brand-muted-soft font-mono tracking-tight bg-brand-cream border-r border-brand-rule h-10 flex items-center">
                    muvx.com/
                  </span>
                  <input
                    {...field}
                    id="org-slug"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="acme-logistics"
                    disabled={!editableFields.has("slug")}
                    className="flex-1 h-10 px-3 text-sm bg-transparent outline-none placeholder:text-brand-muted-soft/60 disabled:opacity-60"
                  />
                </div>
              )}
            />
            <div className="min-h-[20px] text-xs">
              {editableFields.has("slug") && slugChanged && !slugFormatValid && (slugWatch ?? "").length > 0 && (
                <p className="text-brand-accent">
                  Use lowercase letters, numbers, and hyphens only.
                </p>
              )}
              {editableFields.has("slug") && slugChanged && slugFormatValid && slugQuery.isFetching && (
                <p className="text-brand-muted-soft">Checking availability…</p>
              )}
              {editableFields.has("slug") && slugChanged && slugFormatValid && slugAvailable === true && (
                <p className="text-emerald-700 flex items-center gap-1">
                  <Check className="h-3 w-3" /> This URL is available.
                </p>
              )}
              {editableFields.has("slug") && slugChanged && (slugAvailable === false || slugQuery.isError) && (
                <p className="text-brand-accent">✗ This URL is already taken.</p>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-brand-rule" />

        {/* ── Logo ── */}
        <div className="space-y-3">
          <Label>
            Workspace logo
            {!editableFields.has("logo") && (
              <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
            )}
          </Label>
          <Controller
            name="logo"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-start gap-6">
                {field.value ? (
                  <Avatar className="size-24 border border-brand-rule">
                    <AvatarImage
                      src={field.value}
                      alt={form.getValues("name") ?? "Workspace logo"}
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
                  {field.value && editableFields.has("logo") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        field.onChange(null)
                        toast.info("Logo will be removed on save.")
                      }}
                      className="h-8"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                  {editableFields.has("logo") && !field.value && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      disabled={uploadLogoMutation.isPending}
                      className="h-8"
                    >
                      {uploadLogoMutation.isPending ? (
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
                  {!editableFields.has("logo") && (
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
                      if (!editableFields.has("logo")) {
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
            )}
          />
        </div>

        <Separator className="bg-brand-rule" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessType">
              Business type
              {!editableFields.has("businessType") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="businessType"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                  disabled={!editableFields.has("businessType")}
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
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">
              Phone
              {!editableFields.has("phone") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="phone"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="+1 555 123 4567"
                  disabled={!editableFields.has("phone")}
                  className="h-10"
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dotNumber">
              DOT #
              {!editableFields.has("dotNumber") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="dotNumber"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="dotNumber"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="1234567"
                  maxLength={20}
                  disabled={!editableFields.has("dotNumber")}
                  className="h-10 font-mono"
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcNumber">
              MC #
              {!editableFields.has("mcNumber") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="mcNumber"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="mcNumber"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="MC-123456"
                  maxLength={20}
                  disabled={!editableFields.has("mcNumber")}
                  className="h-10 font-mono"
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ein">
              EIN
              {!editableFields.has("ein") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="ein"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="ein"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="12-3456789"
                  maxLength={20}
                  disabled={!editableFields.has("ein")}
                  className="h-10 font-mono"
                />
              )}
            />
          </div>
        </div>
      </TabsContent>

      {/* ─── Address tab ──────────────────────────────────────── */}
      <TabsContent value="address" className="mt-4 space-y-4">
        <Card className="border-brand-rule bg-brand-card p-6 space-y-4">

        <div className="space-y-1.5">
          <Label htmlFor="addressLine1">
            Address line 1
            {!editableFields.has("addressLine1") && (
              <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
            )}
          </Label>
          <Controller
            name="addressLine1"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                id="addressLine1"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder="123 Main St"
                maxLength={200}
                disabled={!editableFields.has("addressLine1")}
                className="h-10"
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="addressLine2">
            Address line 2
            {!editableFields.has("addressLine2") && (
              <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
            )}
          </Label>
          <Controller
            name="addressLine2"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                id="addressLine2"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                placeholder="Suite 200"
                maxLength={200}
                disabled={!editableFields.has("addressLine2")}
                className="h-10"
              />
            )}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5 col-span-2 md:col-span-2">
            <Label htmlFor="city">
              City
              {!editableFields.has("city") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="city"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="city"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="Springfield"
                  maxLength={100}
                  disabled={!editableFields.has("city")}
                  className="h-10"
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">
              State / Province
              {!editableFields.has("state") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="state"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="state"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="IL"
                  maxLength={50}
                  disabled={!editableFields.has("state")}
                  className="h-10"
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">
              Postal code
              {!editableFields.has("postalCode") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="postalCode"
              control={form.control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="postalCode"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="62704"
                  maxLength={20}
                  disabled={!editableFields.has("postalCode")}
                  className="h-10 font-mono"
                />
              )}
            />
          </div>
        </div>
        <div className="space-y-1.5 max-w-[10rem]">
          <Label htmlFor="country">
            Country
            {!editableFields.has("country") && (
              <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
            )}
          </Label>
          <Controller
            name="country"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                id="country"
                value={field.value ?? "US"}
                onChange={(e) =>
                  field.onChange(e.target.value.toUpperCase().slice(0, 2) || "US")
                }
                maxLength={2}
                disabled={!editableFields.has("country")}
                className="h-10 font-mono uppercase"
              />
            )}
          />
        </div>
      </Card>
      </TabsContent>

      {/* ─── Operations tab ────────────────────────────────── */}
      <TabsContent value="operations" className="mt-4 space-y-4">
        <Card className="border-brand-rule bg-brand-card p-6 space-y-4">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="defaultCurrency">
              Default currency
              {!editableFields.has("defaultCurrency") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="defaultCurrency"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "USD"}
                  onValueChange={field.onChange}
                  disabled={!editableFields.has("defaultCurrency")}
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
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timeZone">
              Time zone
              {!editableFields.has("timeZone") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="timeZone"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "America/Chicago"}
                  onValueChange={field.onChange}
                  disabled={!editableFields.has("timeZone")}
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
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fiscalYearStart">
              Fiscal year start
              {!editableFields.has("fiscalYearStart") && (
                <Lock className="inline ml-1.5 h-3 w-3 text-brand-muted-soft" />
              )}
            </Label>
            <Controller
              name="fiscalYearStart"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "01-01"}
                  onValueChange={field.onChange}
                  disabled={!editableFields.has("fiscalYearStart")}
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
              )}
            />
          </div>
        </div>
        </Card>
        </TabsContent>
        </Tabs>

        {/* ─── Save bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-4">
          <div className="text-xs text-brand-muted-soft">
            {isOwnerAdmin ? (
              <>
                <Badge variant="outline" className="border-brand-rule text-brand-muted-soft mr-2">
                  audit logged
                </Badge>
                All changes are recorded in the audit log.
              </>
            ) : (
              <>Read-only — only owners and admins can edit.</>
            )}
          </div>
          <Button
            onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
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
