import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, Download, ShieldCheck, ArrowRight } from "lucide-react"
import {
  getSession,
  getLoadsForOrg,
  getWorkspaceProfile,
  getDriversForOrg,
  getTrucksForOrg,
} from "@/lib/dal"
import { Button } from "@/components/ui/button"
import { DocumentsVaultView } from "@/components/tms/documents-vault-view"

export const instant = false

export default async function DocumentsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  const [loads, profile, drivers, trucks] = await Promise.all([
    getLoadsForOrg(tenantId),
    getWorkspaceProfile(tenantId),
    getDriversForOrg(tenantId),
    getTrucksForOrg(tenantId),
  ])

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto min-w-0">
      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-brand-accent-tint text-brand-accent border border-brand-accent/20">
              <FileText className="size-3.5" />
              Central Document Repository
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Document <span className="italic text-[#d9622b]">Vault</span> & Compliance
          </h1>
          <p className="mt-1 text-sm text-[#73757a]">
            Freight manifests, Bill of Ladings, signed delivery receipts (PODs), and carrier onboarding packets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            render={<Link href="/loads/new" />}
            variant="outline"
            className="h-9 px-3.5 text-xs font-medium border-brand-rule bg-brand-card hover:bg-brand-cream-soft rounded-lg text-brand-ink shadow-2xs"
          >
            Create Freight Manifest
          </Button>
          <Button
            render={<Link href="/safety" />}
            className="h-9 px-4 text-xs font-medium bg-[#d9622b] hover:bg-[#c25422] text-white rounded-lg shadow-sm"
          >
            Driver DQ Files
            <ArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* ─── MAIN VAULT VIEW ─── */}
      <DocumentsVaultView
        loads={loads}
        profile={profile}
        driverCount={drivers.length}
        truckCount={trucks.length}
      />
    </div>
  )
}
