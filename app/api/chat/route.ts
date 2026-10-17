import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai-providers";
import { getSession } from "@/lib/dal";
import { getEffectivePermissions } from "@/lib/can";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.session.activeOrganizationId;
    const body = await req.json().catch(() => ({}));
    const { messages, model, provider } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const perms = tenantId ? await getEffectivePermissions(session.user.id, tenantId) : new Set<string>();

    const targetProvider = provider || (process.env.OPENROUTER_API_KEY ? "openrouter" : "nim");
    const targetModel = model || (targetProvider === "openrouter" ? "openai/gpt-4o-mini" : "meta/llama-3.3-70b-instruct");

    const resolvedModel = getModel(targetProvider, targetModel);

    const systemPrompt = `You are Muvx Copilot, the intelligent AI assistant integrated into Muvx TMS (Transportation Management System).
User: ${session.user.name || session.user.email} (${session.user.role || "Member"})
Workspace: ${tenantId || "Global"}
User Capabilities:
- Can create loads: ${perms.has("loads.create")}
- Can manage fleet: ${perms.has("fleet.trucks.create")}
- Can view financials: ${perms.has("invoices.view_all")}
- Can manage safety/compliance: ${perms.has("safety.module")}

Instructions:
1. Provide concise, professional, freight-fluent assistance for dispatching, fleet management, FMCSA safety compliance, rate confirmations, and load tracking.
2. If asked about freight rates or market conditions, provide practical guidance on cost-per-mile, deadhead minimization, and load staging.
3. Be helpful, clear, and proactive. Keep responses structured and scannable.`;

    const result = streamText({
      model: resolvedModel,
      system: systemPrompt,
      messages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err: any) {
    console.error("[API/CHAT] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal AI chat error" },
      { status: 500 }
    );
  }
}
