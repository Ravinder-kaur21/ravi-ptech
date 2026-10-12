import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSession } from "@/lib/dal"

// Routes that require authentication AND an active organization
const protectedRoutes = [
  "/dashboard",
  "/loads",
  "/trips",
  "/invoices",
  "/fleet",
  "/drivers",
  "/reports",
  "/payroll",
  "/accounts-payable",
  "/expense-review",
  "/carrier-pay",
  "/settings",
  "/notifications",
]

// Admin console — requires authentication only (the (admin) layout enforces
// the superadmin check via SUPERADMIN_EMAILS). Org membership is irrelevant.
const adminRoutes = ["/admin"]

// Routes that require authentication but NOT an organization (onboarding/redirect)
const authOnlyRoutes = ["/onboarding", "/select-org", "/auth-redirect"]

// Public routes (redirect authenticated users with orgs away)
const publicRoutes = ["/login", "/signup", "/signup/verify"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log(`[PROXY] ${request.method} ${pathname}`)

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthOnlyRoute = authOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isCreatingAdditionalWorkspace =
    pathname === "/onboarding" && request.nextUrl.searchParams.get("create") === "1"

  // Get session
  const session = await getSession()
  const isAuthenticated = !!session
  const hasOrg = !!session?.session?.activeOrganizationId

  console.log(
    `[PROXY] Path: ${pathname} | Auth: ${isAuthenticated} | HasOrg: ${hasOrg}`
  )

  // Case 1: Unauthenticated user trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    console.log(`[PROXY] Redirecting unauthenticated user to /login`)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Case 2: Authenticated user without org trying to access protected routes
  if (isProtectedRoute && isAuthenticated && !hasOrg) {
    // Resolve pending invitations, other memberships, and stale active-org
    // state before deciding that this user needs onboarding.
    console.log(`[PROXY] Auth user without active org, redirecting to /auth-redirect`)
    return NextResponse.redirect(new URL("/auth-redirect", request.url))
  }

  // Case 3: Admin route — requires auth, but org membership irrelevant
  if (isAdminRoute && !isAuthenticated) {
    console.log(`[PROXY] Admin route blocked for unauthenticated user`)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Case 4: Authenticated user with org trying to access auth-only routes
  if (isAuthOnlyRoute && isAuthenticated && hasOrg && !isCreatingAdditionalWorkspace) {
    console.log(`[PROXY] Auth user with org, redirecting to /dashboard`)
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Case 5: Authenticated user with org trying to access public routes
  if (isPublicRoute && isAuthenticated) {
    console.log(`[PROXY] Auth user on public route, redirecting to /auth-redirect`)
    return NextResponse.redirect(new URL("/auth-redirect", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (api/auth, api/*)
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
}
