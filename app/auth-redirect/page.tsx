"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Setting up your account...</p>
      </div>
    </div>
  )
}
