"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function AuthRedirectPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const handleRedirect = async () => {
      console.log("[AUTH-REDIRECT] resolving post-auth destination")
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null
      const nextParam = params?.get("next")
      try {
        const r = await fetch("/api/me/routing", { cache: "no-store" })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = (await r.json()) as {
          destination: string
          isPlatformAdmin: boolean
          email: string | null
          activeOrgId: string | null
          orgs: { id: string }[]
        }
        if (!d.email) {
          console.log("[AUTH-REDIRECT] no session, → /login")
          router.push(
            nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"
          )
          return
        }
        // A valid session can have a workspace membership but no active
        // workspace after suspension, logout/login, or a stale session. Set
        // the sole available workspace in the browser before opening the
        // dashboard; Better Auth persists this on the session cookie.
        if (!d.activeOrgId && d.orgs.length === 1) {
          const { error } = await authClient.organization.setActive({
            organizationId: d.orgs[0].id,
          })
          if (error) throw new Error(error.message || "Could not select workspace")
        }
        // Honor ?next= if it's one of our known destinations
        if (
          nextParam &&
          ["/admin", "/dashboard", "/onboarding", "/select-org"].includes(
            nextParam
          )
        ) {
          console.log(`[AUTH-REDIRECT] honoring ?next= → ${nextParam}`)
          router.push(nextParam)
          return
        }
        console.log(
          `[AUTH-REDIRECT] ${d.email} (admin=${d.isPlatformAdmin}) → ${d.destination}`
        )
        router.push(d.destination)
      } catch (err) {
        console.error("[AUTH-REDIRECT] routing fetch failed:", err)
        setError("Something went wrong. Please try signing in again.")
        setTimeout(() => router.push("/login"), 2000)
      }
    }

    handleRedirect()
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3ec] px-4">
        <div className="text-center space-y-2">
          <p className="font-serif text-lg text-brand-accent">{error}</p>
          <p className="text-xs font-mono text-brand-muted-soft">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f3ec] px-4">
      <Card className="w-full max-w-sm border-brand-rule bg-white p-7 shadow-[0_10px_30px_rgba(58,46,30,0.06)] space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-sm" />
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-3 w-4/5 rounded-sm" />
        </div>

        <div className="pt-2">
          <Skeleton className="h-2 w-full rounded-full bg-brand-accent/30" />
        </div>
      </Card>
    </div>
  )
}
