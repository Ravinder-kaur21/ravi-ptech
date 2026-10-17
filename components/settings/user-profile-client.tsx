"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  Mail,
  Building2,
  Lock,
  Loader2,
  Check,
  Smartphone,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

export function UserProfileClient() {
  const activeOrg = useAuthStore((s) => s.activeOrganization)
  const [userName, setUserName] = React.useState("")
  const [userEmail, setUserEmail] = React.useState("")
  const [userImage, setUserImage] = React.useState<string | null>(null)
  const [userRole, setUserRole] = React.useState("member")
  const [joinedAt, setJoinedAt] = React.useState<string | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  // Fetch current session details
  const sessionQuery = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data } = await authClient.getSession()
      return data
    },
  })

  React.useEffect(() => {
    if (sessionQuery.data?.user) {
      setUserName(sessionQuery.data.user.name || "")
      setUserEmail(sessionQuery.data.user.email || "")
      setUserImage(sessionQuery.data.user.image ?? null)
    }
  }, [sessionQuery.data])

  // Fetch membership role in active org
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: orgs } = await authClient.organization.list()
        if (cancelled || !orgs || !activeOrg?.id) return
        const currentOrg = orgs.find((o: any) => o.id === activeOrg.id) as any
        if (currentOrg?.members?.length) {
          const myMember = currentOrg.members[0]
          setUserRole(myMember.role || "member")
          setJoinedAt(myMember.createdAt || null)
        }
      } catch (err) {
        console.error("[PROFILE] fetch member error:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeOrg?.id])

  // Profile update mutation (name & image)
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!userName.trim()) throw new Error("Name cannot be empty")
      const res = await authClient.updateUser({
        name: userName.trim(),
        image: userImage ?? undefined,
      })
      if (res.error) {
        throw new Error(res.error.message || "Failed to update profile")
      }
      return res.data
    },
    onSuccess: () => {
      toast.success("Profile updated successfully")
      sessionQuery.refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword) throw new Error("Please enter your current password")
      if (!newPassword || newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters")
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match")
      }
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })
      if (res.error) {
        throw new Error(res.error.message || "Failed to change password")
      }
      return res.data
    },
    onSuccess: () => {
      toast.success("Password updated successfully. Other sessions have been revoked.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const initials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb / Back */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted-soft hover:text-brand-ink transition-colors font-medium"
        >
          <ArrowLeft className="size-3.5" />
          Back to Settings
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-brand-rule bg-brand-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-xl border border-brand-rule shadow-xs">
              <AvatarImage src={userImage ?? undefined} alt={userName} />
              <AvatarFallback className="rounded-xl bg-brand-accent text-brand-cream text-xl font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl tracking-tight text-brand-ink font-semibold">
                  {userName || "Your Profile"}
                </h1>
                <Badge className="bg-brand-accent-tint text-brand-accent border-brand-accent/20 text-xs font-mono capitalize">
                  {userRole}
                </Badge>
              </div>
              <p className="text-xs text-brand-muted-soft mt-1 flex items-center gap-2">
                <Mail className="size-3 text-brand-muted-soft" />
                {userEmail}
                {activeOrg && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3 text-brand-muted-soft" />
                      {activeOrg.name}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end gap-1.5 text-xs text-brand-muted-soft border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-rule">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              Active Session
            </span>
            <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Verified Authenticated
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Form */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-6">
        <div>
          <h2 className="font-serif text-lg font-semibold text-brand-ink">
            Personal Information
          </h2>
          <p className="text-xs text-brand-muted-soft mt-0.5">
            Your name and identity across workspace dispatches, audits, and communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-name" className="text-xs font-medium text-brand-ink">
              Full Name
            </Label>
            <Input
              id="user-name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email" className="text-xs font-medium text-brand-ink">
              Email Address (Login Identity)
            </Label>
            <Input
              id="user-email"
              value={userEmail}
              disabled
              className="h-9 text-xs bg-brand-cream/40 text-brand-muted-soft font-mono cursor-not-allowed"
            />
            <p className="text-[10px] text-brand-muted-soft">
              Contact your workspace admin or superadmin to update login email.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-brand-muted-soft">
            Changes reflect immediately in the header and activity logs.
          </div>
          <Button
            size="sm"
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending || !userName.trim()}
            className="h-8 text-xs bg-brand-ink hover:bg-brand-ink/90 text-brand-cream"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </Card>

      {/* Security & Password */}
      <Card className="border-brand-rule bg-brand-card p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand-accent" />
            <h2 className="font-serif text-lg font-semibold text-brand-ink">
              Security & Credentials
            </h2>
          </div>
          <p className="text-xs text-brand-muted-soft mt-0.5">
            Change your account password. Updating credentials will sign out other devices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="curr-pass" className="text-xs font-medium text-brand-ink">
              Current Password
            </Label>
            <Input
              id="curr-pass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pass" className="text-xs font-medium text-brand-ink">
              New Password
            </Label>
            <Input
              id="new-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conf-pass" className="text-xs font-medium text-brand-ink">
              Confirm New Password
            </Label>
            <Input
              id="conf-pass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-brand-muted-soft">
            Must be at least 8 characters.
          </div>
          <Button
            size="sm"
            onClick={() => changePasswordMutation.mutate()}
            disabled={
              changePasswordMutation.isPending ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
            className="h-8 text-xs bg-brand-ink hover:bg-brand-ink/90 text-brand-cream"
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Updating…
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
