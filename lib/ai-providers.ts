/**
 * AI Provider Registry
 *
 * Maps provider/model strings to LanguageModel instances.
 * The API route receives `provider` and `model` from the client
 * (via useChat's sendMessage body option) and resolves the model
 * here. `getModel` supports any model name known to the provider —
 * the full list is fetched dynamically at runtime via /api/models.
 *
 * Currently configured:
 *   - "nim"  → NVIDIA NIM (OpenAI-compatible, free tier)
 *
 * @see https://ai-sdk.dev/providers/openai-compatible-providers/nim
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

// ─── NVIDIA NIM (free inference credits for new users) ──────────────────

const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
});

// ─── Model resolution ───────────────────────────────────────────────────

/**
 * Resolve a LanguageModel instance from provider/model strings.
 * Any model name accepted by the provider is supported — the list
 * of available models is fetched dynamically from the provider API.
 */
export function getModel(provider: string, model: string): LanguageModel {
  switch (provider) {
    case "nim":
      return nim.chatModel(model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/** Metadata for a provider/model pair, used by the client selector. */
export interface ProviderModel {
  provider: string;
  model: string;
  label: string;
}
