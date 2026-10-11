"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Mail, CheckCircle2, XCircle, Building2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

type Invitation = {
  id: string
  organizationId: string
  email: string
  role: string
  status: "pending" | "accepted" | "rejected" | "canceled"
  expiresAt: string | Date
  organization?: {
    id: string
    name: string
    slug: string
    logo?: string | null
  } | null
  inviter?: { id: string; name?: string; email?: string } | null
}

export function InviteClient({ invitationId }: { invitationId: string }) {
  const router = useRouter()
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization)

  const [sessionReady, setSessionReady] = useState(false)
  const [sessionUser, setSessionUser] = useState<{ id: string; email: string } | null>(null)

  // Gate: must be signed in
  useEffect(() => {
    console.log("[INVITE] invitationId:", invitationId)
    if (!invitationId) return
    let cancelled = false
    ;(async () => {
      const { data } = await authClient.getSession()
      if (cancelled) return
      if (!data?.user) {
        // Send the user to login with the invite id as a query param so we
        // can come straight back here after sign-in.
        router.replace(
          `/login?next=${encodeURIComponent(`/invite/${invitationId}`)}`
        )
        return
      }
      setSessionUser({ id: data.user.id, email: data.user.email })
      setSessionReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [invitationId, router])

  // Load invitation details
  const inviteQuery = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      console.log("[INVITE] getInvitation →", invitationId)
      const { data, error } = await authClient.organization.getInvitation({
        query: { id: invitationId! },
      })
      if (error) {
        console.error("[INVITE] getInvitation error:", error)
        throw new Error(error.message || "Failed to load invitation")
      }
      console.log("[INVITE] invitation:", data)
      return data as Invitation | null
    },
    enabled: Boolean(invitationId && sessionReady),
    retry: false,
  })

  const invitation = inviteQuery.data
  const expired =
    invitation?.expiresAt &&
    new Date(invitation.expiresAt).getTime() < Date.now()
  const wrongEmail =
    invitation?.email &&
    sessionUser &&
    invitation.email.toLowerCase() !== sessionUser.email.toLowerCase()

  // ─── Accept ───
  const acceptMutation = useMutation({
    mutationFn: async () => {
      console.log("[INVITE] acceptInvitation →", invitationId)
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId: invitationId!,
      })
      if (error) throw new Error(error.message || "Failed to accept invitation")
      return data
    },
    onSuccess: async () => {
      console.log("[INVITE] accepted")
      // Activate the new org
      if (invitation?.organizationId) {
        await authClient.organization.setActive({
          organizationId: invitation.organizationId,
        })
        // Refresh auth store
        setActiveOrganization({
          id: invitation.organizationId,
          name: invitation.organization?.name ?? "",
          slug: invitation.organization?.slug ?? "",
          logo: invitation.organization?.logo ?? null,
          metadata: null,
        })
      }
      toast.success("Welcome to the team!")
      router.replace("/dashboard")
    },
    onError: (err: Error) => {
      console.error("[INVITE] accept failed:", err)
      toast.error(err.message)
    },
  })

  // ─── Reject ───
  const rejectMutation = useMutation({
    mutationFn: async () => {
      console.log("[INVITE] rejectInvitation →", invitationId)
      const { error } = await authClient.organization.rejectInvitation({
        invitationId: invitationId!,
      })
      if (error) throw new Error(error.message || "Failed to decline invitation")
      return true
    },
    onSuccess: () => {
      console.log("[INVITE] rejected")
      toast.success("Invitation declined")
      router.replace("/dashboard")
    },
    onError: (err: Error) => {
      console.error("[INVITE] reject failed:", err)
      toast.error(err.message)
    },
  })

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
      <Card className="border-brand-rule bg-brand-card p-8 max-w-md w-full">
        {inviteQuery.isLoading || !sessionReady ? (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-accent" />
            <p className="mt-3 text-sm text-brand-muted-soft">
              Loading invitation…
            </p>
          </div>
        ) : inviteQuery.isError || !invitation ? (
          <div className="py-8 text-center">
            <XCircle className="h-10 w-10 mx-auto text-brand-accent" />
            <h1 className="font-serif text-2xl mt-3 text-brand-ink">
              Invitation not found
            </h1>
            <p className="mt-2 text-sm text-brand-muted-soft">
              This invitation has been cancelled, already accepted, or expired.
            </p>
            <Button
              onClick={() => router.replace("/dashboard")}
              className="mt-6 bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
            >
              Go to dashboard
            </Button>
          </div>
        ) : expired ? (
          <div className="py-8 text-center">
            <XCircle className="h-10 w-10 mx-auto text-brand-accent" />
            <h1 className="font-serif text-2xl mt-3 text-brand-ink">
              Invitation expired
            </h1>
            <p className="mt-2 text-sm text-brand-muted-soft">
              Ask{" "}
              {invitation.inviter?.name ?? invitation.inviter?.email ?? "your teammate"}{" "}
              to resend the invitation.
            </p>
            <Button
              onClick={() => router.replace("/dashboard")}
              variant="outline"
              className="mt-6"
            >
              Back to dashboard
            </Button>
          </div>
        ) : wrongEmail ? (
          <div className="py-8 text-center">
            <Mail className="h-10 w-10 mx-auto text-brand-accent" />
            <h1 className="font-serif text-2xl mt-3 text-brand-ink">
              Wrong email address
            </h1>
            <p className="mt-2 text-sm text-brand-muted-soft">
              This invitation was sent to <strong>{invitation.email}</strong>.
              You&apos;re signed in as{" "}
              <strong>{sessionUser?.email}</strong>.
            </p>
            <p className="mt-2 text-xs text-brand-muted-soft">
              Sign out and use the original email to accept.
            </p>
          </div>
        ) : (
          <div className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-brand-muted-soft font-medium">
                  You&apos;re invited to
                </p>
                <h1 className="font-serif text-2xl mt-1 text-brand-ink truncate">
                  {invitation.organization?.name ?? "a workspace"}
                </h1>
                <p className="mt-2 text-sm text-brand-muted-soft">
                  {invitation.inviter?.name ?? invitation.inviter?.email ?? "A teammate"}{" "}
                  wants you to join as{" "}
                  <span className="font-medium text-brand-ink">
                    {invitation.role}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => rejectMutation.mutate()}
                disabled={
                  acceptMutation.isPending || rejectMutation.isPending
                }
                className="h-10 px-5 border-brand-rule hover:bg-brand-cream"
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Declining…
                  </>
                ) : (
                  "Decline"
                )}
              </Button>
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={
                  acceptMutation.isPending || rejectMutation.isPending
                }
                className="h-10 px-5 bg-brand-ink hover:bg-brand-ink-soft text-brand-cream"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining…
                  </>
                ) : (
                  <>
                    Accept & join
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {(acceptMutation.isError || rejectMutation.isError) && (
              <p className="mt-4 text-sm text-brand-accent text-center">
                {(acceptMutation.error as Error | null)?.message ??
                  (rejectMutation.error as Error | null)?.message ??
                  "Something went wrong"}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
