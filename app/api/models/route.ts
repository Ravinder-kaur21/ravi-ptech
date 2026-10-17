import { NextResponse } from "next/server";

export const instant = false;

// In-memory cache for models (10 minutes TTL)
let cachedModels: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET() {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasNim = !!process.env.NIM_API_KEY;
  const now = Date.now();

  // Return cached models if still valid
  if (cachedModels && now - lastCacheTime < CACHE_TTL_MS) {
    return NextResponse.json({
      provider: hasOpenRouter ? "openrouter" : "nim",
      models: cachedModels,
    });
  }

  try {
    if (hasOpenRouter) {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://app.muvx.com",
          "X-Title": "Muvx TMS",
        },
      });

      if (!res.ok) {
        throw new Error(`OpenRouter API responded with status ${res.status}`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : [];

      // Priority prefixes for ranking models cleanly in UI
      const priorityOrder = [
        "anthropic/",
        "openai/",
        "deepseek/",
        "google/",
        "meta-llama/",
        "mistralai/",
        "qwen/",
        "cohere/",
        "x-ai/",
      ];

      const mapped = rawList.map((m: any) => ({
        id: m.id as string,
        name: (m.name as string) || m.id,
        description: (m.description as string) || "",
        context_length: m.context_length ? Number(m.context_length) : undefined,
        pricing: m.pricing,
        provider: "openrouter",
      }));

      // Sort: prioritize major flagship models, then alphabetical
      mapped.sort((a: any, b: any) => {
        const aIndex = priorityOrder.findIndex((p) => a.id.startsWith(p));
        const bIndex = priorityOrder.findIndex((p) => b.id.startsWith(p));
        if (aIndex !== -1 && bIndex !== -1) {
          if (aIndex !== bIndex) return aIndex - bIndex;
          return a.name.localeCompare(b.name);
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      cachedModels = mapped;
      lastCacheTime = now;

      return NextResponse.json({
        provider: "openrouter",
        models: mapped,
      });
    }

    if (hasNim) {
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: {
          Authorization: `Bearer ${process.env.NIM_API_KEY}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data.data) ? data.data : [];
        const mapped = rawList.map((m: any) => ({
          id: m.id,
          name: m.id.replace(/^meta\//, "Meta ").replace(/-/g, " "),
          provider: "nim",
        }));

        cachedModels = mapped;
        lastCacheTime = now;

        return NextResponse.json({
          provider: "nim",
          models: mapped,
        });
      }
    }

    return NextResponse.json({
      provider: "openrouter",
      models: [],
      error: "No AI provider API key configured",
    });
  } catch (err: any) {
    console.error("[API/MODELS] Failed to fetch live models from provider:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve models from provider" },
      { status: 500 }
    );
  }
}
