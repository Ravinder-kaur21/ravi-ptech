import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

export const metadata = {
  title: "Privacy Policy · Muvx TMS",
  description: "Privacy policy and data protection commitments for Muvx TMS.",
}

export default function PrivacyPage() {
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
            <Shield className="size-4" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-[#d9622b]">
            Legal & Trust
          </span>
        </div>

        <h1 className="font-serif text-3xl font-semibold sm:text-4xl tracking-tight text-[#16181d] mb-4">
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-[#8a8b8f] mb-8">
          Last updated: October 2026 · SOC 2 Type II Certified
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-[#4a4e57]">
          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              1. Information We Collect
            </h2>
            <p>
              Muvx TMS collects information necessary to deliver transportation management, freight dispatching, billing, load tracking, and fleet operations. This includes user account details, driver records, equipment telemetry, shipment documentation, and organizational metadata.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              2. How Your Data Is Used
            </h2>
            <p>
              Your data is processed strictly to provide freight coordination, carrier validation, rate intelligence, automated accounting, and secure multi-tenant access. We never sell customer or freight data to third parties.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              3. Security & Compliance
            </h2>
            <p>
              We enforce multi-tenant cryptographic tenant isolation, TLS 1.3 encryption in transit, AES-256 encryption at rest, and audit logging across all platform actions.
            </p>
          </section>

          <section className="bg-white rounded-xl border border-[#e5dfd5] p-6 shadow-sm space-y-3">
            <h2 className="font-serif text-lg font-medium text-[#16181d]">
              4. Contact Us
            </h2>
            <p>
              For privacy requests or security compliance inquiries, contact our security officer at{" "}
              <a href="mailto:privacy@muvxtms.com" className="text-[#d9622b] underline">
                privacy@muvxtms.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
