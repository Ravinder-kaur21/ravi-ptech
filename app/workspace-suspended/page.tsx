import Link from "next/link"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { member, organization } from "@/lib/schema"
import { getSession, getIsAdmin } from "@/lib/dal"
import { ShieldOff, ArrowLeftRight, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

// /workspace-suspended is dynamic — reads session + DB.
export const instant = false

/**
 * /workspace-suspended — shown to a user whose membership in their
 * active workspace is suspended. Distinct from /suspended (platform-
 * level account suspension). The user can still:
 *   - sign in (account is fine)
 *   - access other workspaces they're a member of
 *   - switch to another workspace via /select-org
 *
 * Workspace owners / admins cannot be suspended (suspendMemberAction
 * refuses). Platform admins (`user.role='admin'`) bypass this gate.
 */
export default async function WorkspaceSuspendedPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }

  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    redirect("/select-org")
  }

  // Platform admins always bypass — they may need to inspect suspended
  // workspaces as part of support work.
  const isPlatformAdmin = await getIsAdmin()
  if (isPlatformAdmin) {
    redirect(`/dashboard`)
  }

  const rows = await db
    .select({
      memberId: member.id,
      suspendedAt: member.suspendedAt,
      suspendedUntil: member.suspendedUntil,
      suspendedReason: member.suspendedReason,
      orgName: organization.name,
      orgSlug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)),
    )
    .limit(1)

  const row = rows[0]
  const now = new Date()
  const stillSuspended =
    row &&
    row.suspendedAt !== null &&
    (row.suspendedUntil === null ||
      (row.suspendedUntil as Date) > now)

  // If they're no longer suspended (or never were), bounce to dashboard.
  if (!stillSuspended) {
    redirect("/dashboard")
  }

  const liftedAt = row?.suspendedUntil
    ? (row.suspendedUntil as Date).toLocaleDateString(undefined, {
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
            WORKSPACE ACCESS
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
            <ShieldOff className="size-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              You&apos;re suspended from{" "}
              <span className="italic text-brand-accent">
                {row?.orgName ?? "this workspace"}
              </span>
              .
            </h1>
            <p className="mt-1 text-brand-ink/80">
              Signed in as{" "}
              <strong className="text-brand-ink">{session.user.email}</strong>
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-rule bg-brand-card p-6">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
            Reason
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-brand-ink">
            {row?.suspendedReason ?? "No reason provided."}
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
          <p className="mt-4 text-[12px] text-brand-muted-soft">
            Your account is fine — you can still access other workspaces
            you&apos;re a member of.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            render={
              <Link
                href="/select-org"
                className="h-10 rounded-full bg-brand-ink px-5 text-brand-cream hover:bg-brand-ink-soft inline-flex items-center gap-2"
              />
            }
          >
            <ArrowLeftRight className="size-3.5" />
            Switch workspace
          </Button>
          <Button
            render={
              <Link
                href="/api/auth/sign-out"
                className="h-10 rounded-full border border-brand-rule px-5 text-brand-ink hover:bg-brand-cream inline-flex items-center gap-2"
              />
            }
          >
            Sign out
          </Button>
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