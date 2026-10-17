import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Curated list of verified, high-performance models available on OpenRouter */
const DEFAULT_OPENROUTER_MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Fast)", provider: "openrouter" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "openrouter" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", provider: "openrouter" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "openrouter" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openrouter" },
];

const DEFAULT_NIM_MODELS = [
  { id: "meta/llama-3.3-70b-instruct", name: "NIM Llama 3.3 70B", provider: "nim" },
  { id: "mistralai/mistral-large-2-instruct", name: "NIM Mistral Large 2", provider: "nim" },
];

export async function GET() {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasNim = !!process.env.NIM_API_KEY;

  try {
    // If OpenRouter API key is available, attempt to fetch live model list or return curated models
    if (hasOpenRouter) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          next: { revalidate: 3600 },
        });

        if (res.ok) {
          const data = await res.json();
          // Filter to top popular/relevant models
          const allModels = Array.isArray(data.data) ? data.data : [];
          const popularIds = new Set(DEFAULT_OPENROUTER_MODELS.map((m) => m.id));
          
          const filtered = allModels
            .filter((m: any) => popularIds.has(m.id) || m.id.startsWith("anthropic/") || m.id.startsWith("openai/gpt-4") || m.id.startsWith("deepseek/"))
            .slice(0, 15)
            .map((m: any) => ({
              id: m.id,
              name: m.name || m.id,
              provider: "openrouter",
            }));

          if (filtered.length > 0) {
            return NextResponse.json({
              provider: "openrouter",
              models: filtered,
            });
          }
        }
      } catch (e) {
        console.warn("[API/MODELS] Failed to fetch live OpenRouter models, using defaults:", e);
      }

      return NextResponse.json({
        provider: "openrouter",
        models: DEFAULT_OPENROUTER_MODELS,
      });
    }

    if (hasNim) {
      return NextResponse.json({
        provider: "nim",
        models: DEFAULT_NIM_MODELS,
      });
    }

    // Fallback: return default models even if keys aren't loaded yet in dev
    return NextResponse.json({
      provider: "openrouter",
      models: DEFAULT_OPENROUTER_MODELS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve models" },
      { status: 500 }
    );
  }
}
