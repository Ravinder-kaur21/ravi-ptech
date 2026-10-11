import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { user } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/dal"
import { AppealForm } from "@/components/suspended/appeal-form"
import { ShieldOff, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

// /suspended is dynamic — reads session + DB to render per-user state.
export const instant = false

/**
 * /suspended — shown to users whose account is currently suspended.
 *
 * Reads suspension reason + appeal state from the DB (not the cached
 * session) so changes the admin makes are reflected immediately on refresh.
 *
 * Public route — no (dashboard) or (admin) layout wrapping.
 */
export default async function SuspendedPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }

  const rows = await db
    .select({
      email: user.email,
      name: user.name,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil,
      suspendedReason: user.suspendedReason,
      appealMessage: user.appealMessage,
      appealSubmittedAt: user.appealSubmittedAt,
      appealStatus: user.appealStatus,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)

  const row = rows[0]
  if (!row) {
    redirect("/login")
  }

  const now = new Date()
  const suspendedUntil: Date | null = (row.suspendedUntil as Date | null) ?? null
  const stillSuspended =
    row.suspendedAt !== null &&
    (suspendedUntil === null || suspendedUntil > now)

  if (!stillSuspended) {
    redirect("/dashboard")
  }

  const liftedAt = suspendedUntil
    ? suspendedUntil.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col px-6 py-12 md:px-16">
        <div className="flex items-center gap-2.5">
          <span className="size-[7px] shrink-0 rounded-full bg-brand-accent" />
          <span className="font-geist-mono text-[11px] font-medium uppercase tracking-[0.04em] text-brand-ink">
            ACCOUNT STATUS
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
            <ShieldOff className="size-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              Your account is <span className="italic text-brand-accent">suspended</span>.
            </h1>
            <p className="mt-1 text-brand-ink/80">
              Signed in as <strong className="text-brand-ink">{row.email}</strong>
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-rule bg-brand-card p-6">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
            Reason
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-brand-ink">
            {row.suspendedReason ?? "No reason provided."}
          </p>
          {liftedAt && (
            <p className="mt-4 text-[12px] text-brand-muted-soft">
              Suspension lifts automatically on{" "}
              <strong className="text-brand-ink">{liftedAt}</strong> if no
              earlier action is taken.
            </p>
          )}
          {!liftedAt && (
            <p className="mt-4 text-[12px] text-brand-muted-soft">
              This suspension has no automatic end date.
            </p>
          )}
        </div>

        <div className="mt-6">
          {row.appealStatus === "open" ? (
            <div className="rounded-2xl border border-brand-rule bg-brand-card p-6">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
                Appeal in review
              </h2>
              <p className="mt-2 text-sm text-brand-ink">
                We received your appeal on{" "}
                {row.appealSubmittedAt
                  ? new Date(row.appealSubmittedAt as Date | string).toLocaleString()
                  : ""}
                . An admin will respond by email. You can update your appeal
                below if you have more context to share.
              </p>
              <AppealForm
                defaultMessage={(row.appealMessage as string | null) ?? ""}
                resubmit
              />
            </div>
          ) : row.appealStatus === "denied" ? (
            <div className="rounded-2xl border border-brand-rule bg-brand-card p-6">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
                Appeal denied
              </h2>
              <p className="mt-2 text-sm text-brand-ink">
                Your most recent appeal was reviewed and denied. You may
                submit a new appeal if you have additional context.
              </p>
              <AppealForm defaultMessage="" resubmit />
            </div>
          ) : row.appealStatus === "approved" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-emerald-900">
                Appeal approved
              </h2>
              <p className="mt-2 text-sm text-emerald-950">
                Your appeal was approved. Refresh the page or sign out and
                back in to continue.
              </p>
              <form
                action={async () => {
                  "use server"
                  await authClient.signOut()
                  redirect("/login")
                }}
              >
                <Button
                  type="submit"
                  className="mt-4 h-10 rounded-full bg-brand-ink px-5 text-brand-cream"
                >
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-rule bg-brand-card p-6">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
                Appeal this suspension
              </h2>
              <p className="mt-2 text-sm text-brand-ink">
                Explain what happened and why you believe this should be
                reconsidered. An admin will review and respond.
              </p>
              <AppealForm defaultMessage="" />
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between text-xs text-brand-muted-soft">
          <Link href="/" className="hover:text-brand-ink">
            ← Back to muvx.com
          </Link>
          <a
            href="mailto:support@muvx.com"
            className="inline-flex items-center gap-1 hover:text-brand-ink"
          >
            <Mail className="size-3" />
            support@muvx.com
          </a>
        </div>
      </div>
    </div>
  )
}