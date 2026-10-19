import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import ChatInterface from "@/components/chat-interface"
import { getSession } from "@/lib/dal"

export default async function AiPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent">
          <Sparkles className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-brand-muted-soft">
            Muvx operating assistant
          </p>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            <span className="italic text-brand-accent">AI</span>
          </h1>
        </div>
      </div>

      <p className="max-w-2xl text-sm text-brand-ink/80">
        Ask about current loads, trip activity, invoices, carrier pay, and operational issues using your workspace data.
      </p>

      <ChatInterface />
    </div>
  )
}

export const instant = false
