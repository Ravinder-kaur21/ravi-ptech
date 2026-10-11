"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  // Capture ?next= so an invite link can drop the user at /login and bounce
  // them straight back to /invite/[id] after sign-in. Falls back to the
  // existing router-based redirects.
  const [nextPath, setNextPath] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const next = params.get("next")
    if (next && next.startsWith("/")) {
      console.log("[LOGIN] post-login redirect →", next)
      setNextPath(next)
    }
  }, [])
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")
  const [resending, setResending] = useState(false)

  const handleSendOTP = async () => {
    setError("")
    setLoading(true)
    console.log("[LOGIN] Sending OTP to:", email)
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      })
      if (result.error) {
        console.error("[LOGIN] Send OTP error:", result.error)
        setError(result.error.message || "Failed to send code")
        setLoading(false)
        return
      }
      console.log("[LOGIN] ✅ OTP sent")
      setStep("otp")
      setLoading(false)
      toast.success("Login code sent to your email")
    } catch (err) {
      console.error("[LOGIN] Send OTP exception:", err)
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setError("")
    setLoading(true)
    console.log("[LOGIN] Verifying OTP for:", email)
    if (otp.length !== 6) {
      setError("Please enter a 6-digit code")
      setLoading(false)
      return
    }
    try {
      const result = await authClient.signIn.emailOtp({ email, otp })
      if (result.error) {
        console.error("[LOGIN] Verify OTP error:", result.error)
        setError(result.error.message || "Invalid code")
        setLoading(false)
        return
      }
      console.log("[LOGIN] ✅ OTP verified")
      // [LOGIN] Check suspension status before routing anywhere. If the
      // account is currently suspended, bounce to /suspended so the user
      // sees the reason + appeal form instead of the normal flow.
      try {
        const statusRes = await fetch("/api/me/status")
        if (statusRes.ok) {
          const status = await statusRes.json()
          console.log("[LOGIN] status:", status)
          if (status.suspended) {
            console.log("[LOGIN] account suspended → /suspended")
            router.push("/suspended")
            return
          }
        }
      } catch (err) {
        console.warn("[LOGIN] status check failed:", err)
      }

      // If the user came in from an invite link, jump straight back to the
      // /invite/[id] page — the invitation endpoint will load the org from
      // its own state and route appropriately.
      if (nextPath) {
        console.log("[LOGIN] honoring ?next= →", nextPath)
        router.push(nextPath)
        return
      }
      const { data: orgs } = await authClient.organization.list()
      // [LOGIN] organization.list() returns a bare array, not { organizations }
      if (!orgs || orgs.length === 0) {
        router.push("/onboarding")
      } else if (orgs.length === 1) {
        await authClient.organization.setActive({ organizationId: orgs[0].id })
        router.push("/dashboard")
      } else {
        router.push("/select-org")
      }
    } catch (err) {
      console.error("[LOGIN] Verify OTP exception:", err)
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResending(true)
    try {
      await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
      toast.success("Code resent!")
    } catch (err) {
      toast.error("Failed to resend code")
    }
    setResending(false)
  }

  const handleGoogleLogin = async () => {
    setError("")
    setGoogleLoading(true)
    console.log("[LOGIN] Initiating Google login...")
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/auth-redirect",
      })
      if (result.error) {
        console.error("[LOGIN] Google login error:", result.error)
        setError(result.error.message || "Google sign-in failed")
        setGoogleLoading(false)
      }
    } catch (err) {
      console.error("[LOGIN] Google login exception:", err)
      setError("An unexpected error occurred with Google sign-in")
      setGoogleLoading(false)
    }
  }

  return (
    <div className={`w-full max-w-[480px] ${className}`} {...props}>
      {/* Eyebrow */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="size-[7px] shrink-0 rounded-full bg-brand-accent" />
        <span className="font-geist-mono text-[11px] font-medium uppercase tracking-[0.04em] text-brand-ink">
          {step === "email" ? "WELCOME BACK" : "CHECK YOUR EMAIL"}
        </span>
        <span className="font-geist-mono text-[11px] tracking-[0.04em] text-brand-muted-soft">
          · {step === "email" ? "SIGN IN TO MUVX" : "WE SENT YOU A CODE"}
        </span>
      </div>

      {/* Headline */}
      <h1 className="font-serif text-[clamp(40px,5vw,56px)] leading-[0.96] tracking-[-0.04em] text-brand-ink mb-2">
        {step === "email" ? (
          <>Sign in to <span className="italic text-brand-accent">Muvx</span>.</>
        ) : (
          <>Enter your <span className="italic text-brand-accent">code</span>.</>
        )}
      </h1>
      <p className="text-[#4a4e57] font-geist mb-8">
        {step === "email"
          ? "We'll email you a code — no password to remember."
          : <>Code sent to <strong className="text-brand-ink">{email}</strong></>}
      </p>

      <Card className="border-brand-rule bg-[#fffefb] shadow-[0_10px_30px_rgba(58,46,30,0.06)]">
        <div className="p-7">
          {error && (
            <div className="mb-5 p-3 text-sm text-brand-accent bg-brand-accent/[0.08] border border-brand-accent/30 rounded-xl">
              {error}
            </div>
          )}

          {step === "email" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-brand-rule hover:bg-[#fbf8f3] bg-brand-card font-geist"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="relative my-6 flex items-center">
                <div className="flex-1 border-t border-brand-rule" />
                <span className="px-3 text-xs font-geist-mono tracking-[0.04em] text-brand-muted-soft uppercase">
                  or
                </span>
                <div className="flex-1 border-t border-brand-rule" />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="font-geist-mono text-[10px] font-medium tracking-[0.04em] text-brand-muted-soft uppercase">
                    Work email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-brand-rule focus-visible:ring-brand-ink/10 focus-visible:border-brand-ink bg-brand-card"
                    required
                  />
                </div>

                <Button
                  type="button"
                  className="w-full h-12 rounded-full bg-brand-ink hover:bg-brand-ink-soft font-geist text-brand-cream"
                  onClick={handleSendOTP}
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    "Send login code"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="font-geist-mono text-[10px] font-medium tracking-[0.04em] text-brand-muted-soft uppercase">
                  Verification code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-mono border-brand-rule focus-visible:ring-brand-ink/10 focus-visible:border-brand-ink bg-brand-card"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="button"
                className="w-full h-12 rounded-full bg-brand-ink hover:bg-brand-ink-soft font-geist text-brand-cream"
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and sign in"
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm font-geist">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp("") }}
                  className="text-brand-muted-soft hover:text-brand-ink"
                >
                  Use different email
                </button>
                <span className="text-brand-rule">·</span>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resending}
                  className="text-brand-muted-soft hover:text-brand-ink disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {step === "email" && (
        <p className="text-center text-sm text-[#4a4e57] font-geist mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand-ink font-medium hover:underline">
            Create one
          </Link>
        </p>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
