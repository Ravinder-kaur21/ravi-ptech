import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, ArrowRight, Download, Plus } from "lucide-react"
import {
  getSession,
  getDriversWithDetailsForOrg,
  getTrucksForOrg,
  getTrailersForOrg,
} from "@/lib/dal"
import { Button } from "@/components/ui/button"
import { SafetyComplianceView } from "@/components/tms/safety-compliance-view"

export const instant = false

export default async function SafetyPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [drivers, trucks, trailers] = await Promise.all([
    getDriversWithDetailsForOrg(tenantId),
    getTrucksForOrg(tenantId),
    getTrailersForOrg(tenantId),
  ])

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto min-w-0">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="size-3.5" />
              FMCSA / DOT Compliance Hub
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Safety & <span className="italic text-[#d9622b]">Compliance</span>
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            Driver qualification files, CDL expiration monitoring, and equipment road readiness audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            render={<Link href="/drivers" />}
            variant="outline"
            className="h-9 px-3.5 text-xs font-medium border-brand-rule bg-brand-card hover:bg-brand-cream-soft rounded-lg text-brand-ink shadow-2xs"
          >
            Manage Driver Files
            <ArrowRight className="size-3.5 ml-1.5 text-brand-muted-soft" />
          </Button>
          <Button
            render={<Link href="/fleet" />}
            className="h-9 px-4 text-xs font-medium bg-[#d9622b] hover:bg-[#c25422] text-white rounded-lg shadow-sm"
          >
            Fleet Inspections
            <ArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* ─── MAIN SAFETY COMPLIANCE VIEW ─── */}
      <SafetyComplianceView
        drivers={drivers}
        trucks={trucks}
        trailers={trailers}
      />
    </div>
  )
}
