"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Building2, Check } from "lucide-react"
import { toast } from "sonner"

export function WorkspaceSettingsClient() {
  const router = useRouter()
  const activeOrg = useAuthStore((s) => s.activeOrganization)
  const setActiveOrganization = useAuthStore(
    (s) => s.setActiveOrganization
  )

  const [name, setName] = useState(activeOrg?.name ?? "")
  const [slug, setSlug] = useState(activeOrg?.slug ?? "")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => {
    console.log("[WORKSPACE] activeOrg:", activeOrg)
  }, [activeOrg])

  // Guard
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await authClient.getSession()
      if (cancelled) return
      if (!data?.user) {
        router.replace("/login")
        return
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  // ─── Slug auto-derived from name (only until user edits) ───
  useEffect(() => {
    if (slugManuallyEdited) return
    const gen = (activeOrg?.name ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50)
    setName(activeOrg?.name ?? "")
    setSlug(gen ?? activeOrg?.slug ?? "")
    // Only auto-fill once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id])

  const slugClean = slug.trim().toLowerCase()
  const slugFormatValid = /^[a-z0-9-]{2,50}$/.test(slugClean)

  // ─── Slug availability (only when changed) ───
  const slugChanged = slugClean !== (activeOrg?.slug ?? "")
  const slugQuery = useQuery({
    queryKey: ["check-slug", slugClean, activeOrg?.id],
    queryFn: async () => {
      console.log("[WORKSPACE] checkSlug →", slugClean)
      const { data, error } = await authClient.organization.checkSlug({
        slug: slugClean,
      })
      if (error) {
        console.warn("[WORKSPACE] checkSlug error:", error.code)
        throw new Error(error.code || "SLUG_CHECK_FAILED")
      }
      return data
    },
    enabled: slugChanged && slugFormatValid,
    staleTime: 10 * 1000,
    retry: false,
  })
  const slugAvailable = slugChanged
    ? slugQuery.data
      ? slugQuery.data.status === true
      : slugQuery.isError
        ? false
        : null
    : true // not changed → safe

  const dirty = name.trim() !== (activeOrg?.name ?? "") || slugClean !== (activeOrg?.slug ?? "")
  const canSave =
    dirty &&
    name.trim().length >= 2 &&
    slugFormatValid &&
    slugAvailable === true

  // ─── Save ───
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrg?.id) throw new Error("No active workspace")
      console.log("[WORKSPACE] update →", { name: name.trim(), slug: slugClean })
      const { data, error } = await authClient.organization.update({
        organizationId: activeOrg.id,
        data: {
          name: name.trim(),
          slug: slugClean,
        },
      })
      if (error) {
        switch (error.code) {
          case "ORGANIZATION_SLUG_ALREADY_TAKEN":
            throw new Error("That URL is already taken.")
          case "SLUG_INVALID":
          case "INVALID_SLUG":
            throw new Error("Use lowercase letters, numbers, and hyphens only.")
          default:
            throw new Error(error.message || "Failed to update workspace")
        }
      }
      return data
    },
    onSuccess: (org) => {
      console.log("[WORKSPACE] updated:", org)
      // Sync auth store with the new org identity
      const updated = org as any
      if (updated?.id && activeOrg) {
        setActiveOrganization({
          ...activeOrg,
          name: updated.name ?? name.trim(),
          slug: updated.slug ?? slugClean,
          logo: updated.logo ?? activeOrg.logo,
          metadata: updated.metadata ?? activeOrg.metadata,
        })
        console.log("[WORKSPACE] auth store synced")
      }
      toast.success("Workspace updated")
    },
    onError: (err: Error) => {
      console.error("[WORKSPACE] update failed:", err)
      toast.error(err.message)
    },
  })

  if (!ready) {
    return (
      <div className="p-8 flex justify-center text-brand-muted-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
            <Building2 className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">Workspace</span>
          </h1>
        </div>
        <p className="text-sm text-brand-ink/80">
          Update your workspace name and URL. Changes are visible to your team
          immediately.
        </p>
      </div>

      <Card className="border-brand-rule bg-brand-card p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Workspace name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Logistics"
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
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true)
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                )
              }}
              placeholder="acme-logistics"
              className="flex-1 h-10 px-3 text-sm bg-transparent outline-none placeholder:text-brand-muted-soft/60"
            />
          </div>
          <div className="min-h-[20px] text-xs">
            {slugChanged && !slugFormatValid && slug.length > 0 && (
              <p className="text-brand-accent">
                Use lowercase letters, numbers, and hyphens only.
              </p>
            )}
            {slugChanged && slugFormatValid && slugQuery.isFetching && (
              <p className="text-brand-muted-soft">Checking availability…</p>
            )}
            {slugChanged && slugFormatValid && slugAvailable === true && (
              <p className="text-emerald-700 flex items-center gap-1">
                <Check className="h-3 w-3" /> This URL is available.
              </p>
            )}
            {slugChanged && (slugAvailable === false || slugQuery.isError) && (
              <p className="text-brand-accent">✗ This URL is already taken.</p>
            )}
            {!slugChanged && (
              <p className="text-brand-muted-soft">Current URL.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!canSave || updateMutation.isPending}
            className="bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
