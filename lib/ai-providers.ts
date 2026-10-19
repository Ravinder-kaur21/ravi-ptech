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

const nimApiKey = process.env.NIM_API_KEY;

export const SUPPORTED_NIM_MODELS = [
  "meta/llama-3.2-11b-vision-instruct",
] as const;

export const DEFAULT_NIM_MODEL = SUPPORTED_NIM_MODELS[0];

if (!nimApiKey) {
  console.warn("[AI] NIM_API_KEY is not configured; AI requests will fail until it is set in the server environment.");
}

// ─── NVIDIA NIM (free inference credits for new users) ──────────────────

const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${nimApiKey ?? ""}`,
  },
});

// ─── Model resolution ───────────────────────────────────────────────────

/**
 * Resolve a LanguageModel instance from provider/model strings.
 * NVIDIA NIM exposes a few account-scoped models; the app keeps a small
 * allowlist of known-good ones so unsupported runtime IDs do not trigger 404s.
 */
export function resolveNimModel(modelName: string | undefined | null): string {
  const candidate = modelName?.trim();
  if (!candidate) return DEFAULT_NIM_MODEL;

  return SUPPORTED_NIM_MODELS.includes(candidate as (typeof SUPPORTED_NIM_MODELS)[number])
    ? candidate
    : DEFAULT_NIM_MODEL;
}

export function getModel(provider: string, model: string): LanguageModel {
  if (!nimApiKey) {
    throw new Error("Missing NIM_API_KEY. Add NIM_API_KEY to your server environment before using the AI assistant.");
  }

  switch (provider) {
    case "nim":
      return nim.chatModel(resolveNimModel(model));
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
