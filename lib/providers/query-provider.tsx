"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect, type ReactNode } from "react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { authClient } from "@/lib/auth-client"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  const { setUser, setActiveOrganization, setLoading, isLoading } =
    useAuthStore()

  // Hydrate auth store on mount
  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      try {
        // Get session
        const { data: session } = await authClient.getSession()
        if (!mounted) return

        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            emailVerified: session.user.emailVerified,
            image: session.user.image,
            phone: (session.user as any).phone ?? null,
            role: (session.user as any).role ?? null,
          })

          // Get active org
          if (session.session.activeOrganizationId) {
            const { data: org } = await authClient.organization.getFullOrganization(
              {
                query: {
                  organizationId: session.session.activeOrganizationId,
                },
              }
            )
            if (mounted && org) {
              setActiveOrganization({
                id: org.id,
                name: org.name,
                slug: org.slug,
                logo: org.logo,
                // metadata from Better Auth is already a record/object
                metadata: (org.metadata as Record<string, any>) ?? null,
              })
            }
          }
        }
      } catch (err) {
        console.error("Failed to hydrate auth:", err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      mounted = false
    }
  }, [setUser, setActiveOrganization, setLoading])

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}
