"use client";

/**
 * Token / context-window meter — built with the official AI Elements `<Context>`
 * primitive + `tokenlens` for cost-aware accounting. Replaces the bespoke
 * `ai-context-meter.tsx` widget.
 *
 * Per elements.ai-sdk.dev/components/context, `<Context>` is the canonical
 * surface for "what is loaded into the model right now" and renders used/max
 * with `<Progress />` plus per-bucket cost rows via `<ContextInputUsage />` etc.
 */
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextCacheUsage,
} from "@/components/ai-elements/context"
import type { LanguageModelUsage } from "ai"
import { getUsage } from "tokenlens"

interface Props {
  usage?: LanguageModelUsage
  modelId?: string
}

function approxMax(_modelId?: string): number {
  return 200_000
}

function tokensUsed(u?: LanguageModelUsage, modelId?: string): number {
  if (!u) return 0
  const seen = getUsage({ modelId: modelId ?? "default", usage: u as any }) as any
  if (seen && typeof seen.totalTokens === "number") return seen.totalTokens
  return (u.inputTokens ?? 0) + (u.outputTokens ?? 0)
}

export function CopilotContextMeter({ usage, modelId }: Props) {
  const used = tokensUsed(usage, modelId)
  const max = approxMax(modelId)
  if (used === 0) return null
  return (
    <Context usedTokens={used} maxTokens={max} usage={usage} modelId={modelId ?? "default"}>
      <ContextTrigger />
      <ContextContent>
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  )
}
