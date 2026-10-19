import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { NewTruckForm } from "@/components/new-truck-form"
import { getSession } from "@/lib/dal"

export const instant = false

export default async function NewTruckPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  if (!session.session.activeOrganizationId) redirect("/onboarding")

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <Link
        href="/fleet"
        className="inline-flex items-center gap-1 text-[13px] text-brand-muted-soft transition-colors hover:text-brand-ink"
      >
        <ChevronLeft className="size-3.5" />
        Back to fleet
      </Link>

      <div>
        <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
          Add <span className="italic text-brand-accent">truck</span>
        </h1>
        <p className="mt-1 text-sm text-brand-ink/80">
          Add a truck to this workspace&apos;s fleet.
        </p>
      </div>

      <Card className="border-brand-rule bg-brand-card p-6">
        <NewTruckForm />
      </Card>
    </div>
  )
}
