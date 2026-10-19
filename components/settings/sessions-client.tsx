"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  ArrowLeft,
  Laptop,
  Smartphone,
  Globe,
  LogOut,
  Loader2,
  Clock,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"

export function SessionsClient() {
  const { data: sessionData, refetch, isLoading } = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const res = await authClient.listSessions()
      return res.data ?? []
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await authClient.revokeSession({ token })
      if (res.error) throw new Error(res.error.message || "Failed to revoke session")
      return res.data
    },
    onSuccess: () => {
      toast.success("Session revoked successfully")
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const revokeOtherMutation = useMutation({
    mutationFn: async () => {
      const res = await authClient.revokeOtherSessions()
      if (res.error) throw new Error(res.error.message || "Failed to revoke other sessions")
      return res.data
    },
    onSuccess: () => {
      toast.success("All other sessions have been signed out.")
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const sessions = sessionData ?? []

  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl tracking-tight text-brand-ink font-semibold">
                Active Devices & Sessions
              </h1>
              <p className="text-xs text-brand-muted-soft mt-1 max-w-xl leading-relaxed">
                Review all browsers and devices currently signed into your Muvx account. If you spot unfamiliar activity, revoke the session immediately.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-brand-rule">
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeOtherMutation.mutate()}
              disabled={revokeOtherMutation.isPending || sessions.length <= 1}
              className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              {revokeOtherMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <LogOut className="mr-1.5 size-3.5" />
              )}
              Sign Out Other Devices
            </Button>
          </div>
        </div>
      </div>

      {/* ─── KPI Dashboard Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Laptop className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">
            {isLoading ? "—" : sessions.length}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active Sessions</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Connected login tokens</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            Current
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Primary Session</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">This active browser instance</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700">
              <Smartphone className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-blue-700">
            {isLoading ? "—" : Math.max(0, sessions.length - 1)}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Other Devices</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Secondary logged-in devices</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700">
              <Globe className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-purple-700">
            Secured
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Encryption Level</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Better Auth HTTPS cookies</p>
        </Card>
      </div>

      {/* Sessions List */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden">
        <div className="p-4 border-b border-brand-rule flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-brand-ink">
            Current Active Sessions ({sessions.length})
          </h2>
          <span className="text-[11px] text-brand-muted-soft font-mono">
            Secured via Better Auth
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-brand-muted-soft flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading active sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-brand-muted-soft">
            No active remote sessions found.
          </div>
        ) : (
          <ul className="divide-y divide-brand-rule">
            {sessions.map((sess: any, idx: number) => {
              const isCurrent = idx === 0 // primary active token
              const ua = sess.userAgent || "Desktop Browser"
              const isMobile = /mobile|iphone|android/i.test(ua)

              return (
                <li key={sess.id || idx} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand-cream/60 border border-brand-rule text-brand-ink shrink-0">
                      {isMobile ? (
                        <Smartphone className="size-5 text-brand-muted-soft" />
                      ) : (
                        <Laptop className="size-5 text-brand-ink" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-ink">
                          {ua.split("(")[0]?.trim() || "Web Browser"}
                        </span>
                        {isCurrent && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono px-1.5 py-0">
                            Current Device
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-brand-muted-soft font-mono">
                        <span className="flex items-center gap-1">
                          <Globe className="size-3 text-brand-muted-soft" />
                          {formatSessionIp(sess.ipAddress)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-brand-muted-soft" />
                          {sess.createdAt
                            ? new Date(sess.createdAt).toLocaleDateString()
                            : "Recently Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeMutation.mutate(sess.token)}
                      disabled={revokeMutation.isPending}
                      className="h-8 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

function formatSessionIp(ip?: string | null) {
  if (
    !ip ||
    ip === "0000:0000:0000:0000:0000:0000:0000:0000" ||
    ip === "::1" ||
    ip === "127.0.0.1"
  ) {
    return "127.0.0.1 (Localhost)"
  }
  return ip
}
