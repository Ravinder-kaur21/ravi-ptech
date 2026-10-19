import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { getSession, getTrucksForOrg } from "@/lib/dal"

export default async function FleetPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")
  const trucks = await getTrucksForOrg(tenantId)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Truck className="size-4" strokeWidth={1.8} />
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
              <span className="italic text-brand-accent">Fleet</span>
            </h1>
          </div>
          <p className="text-sm text-brand-ink/80">
            Manage your trucks, trailers, and equipment in one place.
          </p>
        </div>
        <Button
          render={<Link href="/fleet/new" />}
          className="h-9 rounded-full bg-brand-ink px-4 text-brand-cream hover:bg-brand-ink-soft"
        >
          <Plus className="mr-1.5 size-4" />
          Add truck
        </Button>
      </div>

      {trucks.length === 0 ? (
        <Card className="border-brand-rule bg-brand-card p-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-accent-tint text-brand-accent">
            <Truck className="size-5" />
          </div>
          <p className="font-medium text-brand-ink">No trucks yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-brand-muted-soft">
            Add your first truck to start building your workspace fleet.
          </p>
          <Button
            render={<Link href="/fleet/new" />}
            className="mt-4 h-9 rounded-full bg-brand-ink px-4 text-brand-cream hover:bg-brand-ink-soft"
          >
            <Plus className="mr-1.5 size-4" />
            Add your first truck
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {trucks.map((item) => (
            <Card
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 border-brand-rule bg-brand-card p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-cream text-brand-ink">
                  <Truck className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-brand-ink">
                    {item.unitNumber}
                    {item.make || item.model
                      ? ` · ${[item.year, item.make, item.model].filter(Boolean).join(" ")}`
                      : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-muted-soft">
                    {item.licensePlate
                      ? `${item.licensePlate}${item.licenseState ? ` · ${item.licenseState}` : ""}`
                      : "No license plate recorded"}
                    {item.currentMiles ? ` · ${item.currentMiles} mi` : ""}
                  </p>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Reads session data at request time — opt out of instant-navigation prerendering
export const instant = false
