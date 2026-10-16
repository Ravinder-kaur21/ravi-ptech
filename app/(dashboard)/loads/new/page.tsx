import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { Card } from "@/components/ui/card"
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
    <div className="p-4 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <Link
        href="/loads"
        className="inline-flex items-center gap-1 text-[13px] text-brand-muted-soft hover:text-brand-ink transition-colors"
      >
        <ChevronLeft className="size-3.5" />
        Back to loads
      </Link>

      <div>
        <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
          New <span className="italic text-brand-accent">load</span>
        </h1>
        <p className="mt-1 text-sm text-brand-ink/80">
          Create a draft load. You can dispatch it once the details are confirmed.
        </p>
      </div>

      <Card className="border-brand-rule bg-brand-card p-6">
        <NewLoadForm />
      </Card>
    </div>
  )
}
