"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

export default function AuthRedirectPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const handleRedirect = async () => {
      console.log("[AUTH-REDIRECT] Checking session and organizations...")

      // If the user came from an invite link with ?next=, honor it after
      // we verify they're signed in. This defends the Google callback path
      // for invitations.
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null
      const nextParam = params?.get("next")

      try {
        // Get current session
        const { data: session } = await authClient.getSession()

        if (!session?.user) {
          console.log("[AUTH-REDIRECT] No session, redirecting to login")
          router.push(nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login")
          return
        }

        console.log("[AUTH-REDIRECT] Session user:", session.user.email)

        // If we have a ?next= (e.g. /invite/[id]), honor it directly.
        if (nextParam && nextParam.startsWith("/")) {
          console.log("[AUTH-REDIRECT] honoring ?next= →", nextParam)
          router.push(nextParam)
          return
        }

        // Check organizations
        const { data: orgs } = await authClient.organization.list()

        // [AUTH-REDIRECT] organization.list() returns a bare array
        if (!orgs || orgs.length === 0) {
          console.log("[AUTH-REDIRECT] No org, redirecting to onboarding")
          router.push("/onboarding")
        } else if (orgs.length === 1) {
          console.log(
            "[AUTH-REDIRECT] One org, setting active:",
            orgs[0].id
          )
          await authClient.organization.setActive({
            organizationId: orgs[0].id,
          })
          router.push("/dashboard")
        } else {
          console.log(
            "[AUTH-REDIRECT] Multiple orgs, going to selector:",
            orgs.length
          )
          router.push("/select-org")
        }
      } catch (err) {
        console.error("[AUTH-REDIRECT] Error:", err)
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
