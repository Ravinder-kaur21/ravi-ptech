import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import ChatInterface from "@/components/chat-interface";
import { Sparkles, Bot, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) redirect("/onboarding");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-brand-cream/30">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-brand-rule bg-brand-card px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-accent-tint text-brand-accent shadow-xs">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg font-semibold tracking-tight text-brand-ink">
                Muvx Copilot
              </h1>
              <Badge variant="secondary" className="text-[10px] font-mono tracking-wider bg-brand-cream/80 text-brand-muted-soft border-brand-rule">
                Autonomous Assistant
              </Badge>
            </div>
            <p className="text-[11px] text-brand-muted-soft">
              Real-time dispatching, rate analysis, FMCSA safety compliance & load intelligence
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-brand-muted-soft">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <span className="font-mono text-[11px]">Role-Gated & Secure</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
