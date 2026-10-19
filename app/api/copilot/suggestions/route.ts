import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { getModel } from "@/lib/ai-providers"
import { getSession } from "@/lib/dal"

export const maxDuration = 20

/** Shape the model must return — enforced by `generateObject`. */
const suggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().describe("Short chip label, max 6 words"),
        prompt: z.string().describe("The full message sent when clicked"),
      }),
    )
    .min(3)
    .max(4),
})

/** Static fallback so the chips row never renders empty. */
const FALLBACK = [
  {
    title: "Show today's active loads",
    prompt: "Show me all loads active today with their current status.",
  },
  {
    title: "Audit missing PODs",
    prompt: "Find delivered loads from the last 7 days that are still missing a signed POD.",
  },
  {
    title: "Fleet availability",
    prompt: "Which tractors and drivers are available for dispatch right now?",
  },
  {
    title: "Overdue AR",
    prompt: "Show me the oldest overdue customer invoices and their aging balances.",
  },
]

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const transcript = typeof body?.transcript === "string" ? body.transcript : ""
    const role = typeof body?.role === "string" ? body.role : "main"
    const modelId = typeof body?.model === "string" ? body.model : ""

    // Nothing to build on — return the generic freight starters.
    if (transcript.trim().length < 20) {
      return NextResponse.json({ suggestions: FALLBACK })
    }

    const hasKey = process.env.OPENROUTER_API_KEY
    const provider = hasKey ? "openrouter" : "nim"
    const model = modelId
      ? getModel(provider, modelId)
      : getModel(
          provider,
          provider === "openrouter"
            ? "openai/gpt-4o-mini"
            : "meta/llama-3.3-70b-instruct",
        )

    // Cheap model, tiny prompt, structured output — this runs on every turn so
    // latency matters more than depth.
    const { object } = await generateObject({
      model,
      schema: suggestionsSchema,
      system:
        "You propose the next 3-4 things a dispatcher would most likely ask next in an " +
        "enterprise trucking TMS. Base them strictly on what was just discussed — the " +
        "loads, drivers, invoices, carriers, or documents named. Never repeat a question " +
        "already asked. Keep titles under 6 words and make every prompt directly executable.",
      prompt: `Conversation so far:\n\n${transcript.slice(-3000)}\n\nRole: ${role}`,
    })

    const suggestions = object.suggestions.filter(
      (s) => s.title?.trim() && s.prompt?.trim(),
    )

    return NextResponse.json({
      suggestions: suggestions.length >= 3 ? suggestions : FALLBACK,
    })
  } catch (error) {
    console.error("[COPILOT-SUGGESTIONS] Error:", error)
    // A failed suggestion call must never break the chat UI.
    return NextResponse.json({ suggestions: FALLBACK })
  }
}