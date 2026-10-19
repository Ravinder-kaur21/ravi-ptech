import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"

export const metadata = {
  title: "Terms of Service · Muvx TMS",
  description: "Terms of service and subscription agreements for Muvx TMS.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f5f2ec] px-4 py-12 text-[#16181d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#8a8b8f] hover:text-[#16181d] transition-colors mb-8"
        >
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-[#16181d] text-[#f5f2ec] flex items-center justify-center">
            <FileText className="size-4" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-[#d9622b]">
            Legal & Terms
          </span>
        </div>

        <h1 className="font-serif text-3xl font-semibold sm:text-4xl tracking-tight text-[#16181d] mb-4">
          Terms of Service
        </h1>
        <p className="text-xs font-mono text-[#8a8b8f] mb-8">
          Last updated: October 2026
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-[#4a4e57]">
          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Muvx Transportation Management System (&quot;Muvx TMS&quot;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a carrier, brokerage, or logistics company, you represent that you have the authority to bind such entity.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              2. Subscription & Tenant Responsibilities
            </h2>
            <p>
              Each organization maintains administrative control over its workspace, member roles, dispatch data, rate confirmations, driver assignments, and settlements. Users are responsible for safeguarding login credentials and maintaining accurate operational records.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              3. Service Level & Availability
            </h2>
            <p>
              Muvx TMS targets a 99.9% uptime SLA for core dispatching, document generation, and load tracking APIs. Scheduled maintenance windows will be communicated in advance via in-app announcements.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              4. Contact & Support
            </h2>
            <p>
              For legal inquiries or enterprise service level agreements, reach out to{" "}
              <a href="mailto:support@muvxtms.com" className="text-[#d9622b] underline">
                support@muvxtms.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
