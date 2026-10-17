import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { NewLoadForm } from "@/components/new-load-form"

export const instant = false

export default async function NewLoadPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const perms = await getEffectivePermissions(session.user.id, tenantId)
  if (!perms.has("loads.create")) {
    redirect("/loads")
  }

  return (
    <div className="min-h-full py-6 md:py-10 px-4 md:px-8">
      <div className="mx-auto max-w-[800px] space-y-6">
        {/* Subtle Top Breadcrumb */}
        <div>
          <Link
            href="/loads"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand-muted-soft hover:text-brand-ink transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to loads
          </Link>
        </div>

        {/* Breathing Load Creator Canvas */}
        <NewLoadForm />
      </div>
    </div>
  )
}
