"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, LogOut, Loader2 } from "lucide-react"

type Organization = {
  id: string
  name: string
  slug: string
  logo?: string | null
}

export default function SelectOrgPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const { data } = await authClient.organization.list()
        // [SELECT-ORG] organization.list() returns a bare array
        setOrgs(data ?? [])
      } catch (err) {
        console.error("Failed to fetch orgs:", err)
      }
      setLoading(false)
    }

    fetchOrgs()
  }, [])

  const handleSelectOrg = async (orgId: string) => {
    setSelecting(orgId)
    try {
      await authClient.organization.setActive({
        organizationId: orgId,
      })
      router.push("/dashboard")
    } catch (err) {
      console.error("Failed to set active org:", err)
      setSelecting(null)
    }
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3ec] px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-56 mx-auto rounded-lg" />
            <Skeleton className="h-4 w-44 mx-auto rounded-md" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e5dfd5] shadow-sm"
              >
                <Skeleton className="size-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Select your company</h1>
          <p className="text-gray-600 mt-2">
            You have access to {orgs.length} compan
            {orgs.length !== 1 ? "ies" : "y"}
          </p>
        </div>

        <div className="space-y-3">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelectOrg(org.id)}
              disabled={selecting !== null}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{org.name}</p>
                <p className="text-sm text-gray-500">/{org.slug}</p>
              </div>
              {selecting === org.id && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
