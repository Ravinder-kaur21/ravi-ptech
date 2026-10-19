import { NextResponse } from "next/server"
import { DEFAULT_NIM_MODEL, SUPPORTED_NIM_MODELS } from "@/lib/ai-providers"

const FALLBACK_MODELS = [...SUPPORTED_NIM_MODELS]

export async function GET() {
  const apiKey = process.env.NIM_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      models: FALLBACK_MODELS.map((id) => ({ id })),
      warning: "NIM_API_KEY is not configured on the server. Add it to your environment to enable live AI responses.",
      defaultModel: DEFAULT_NIM_MODEL,
    })
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Models fetch failed with ${response.status}`)
    }

    const payload = (await response.json()) as { data?: Array<{ id?: string }> }
    const seen = new Set<string>()
    const models = FALLBACK_MODELS.filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    }).map((id) => ({ id }))

    return NextResponse.json({
      models,
      defaultModel: DEFAULT_NIM_MODEL,
    })
  } catch (error) {
    console.error("[AI] Could not fetch model list from NVIDIA NIM:", error)
    return NextResponse.json({
      models: FALLBACK_MODELS.map((id) => ({ id })),
      warning: "The provider is unavailable right now; the app is still using the fallback model list.",
      defaultModel: DEFAULT_NIM_MODEL,
    })
  }
}
