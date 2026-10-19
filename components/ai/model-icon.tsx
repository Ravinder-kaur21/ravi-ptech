"use client";

import React from "react";
import {
  Claude,
  OpenAI,
  Gemini,
  DeepSeek,
  Meta,
  Mistral,
  Qwen,
  Cohere,
  XAI,
  Minimax,
  Perplexity,
  OpenRouter,
} from "@lobehub/icons";

export function ModelIcon({
  modelId,
  className,
  size = 16,
}: {
  modelId?: string;
  className?: string;
  size?: number;
}) {
  if (!modelId) return <OpenRouter size={size} className={className} />;

  const id = modelId.toLowerCase();

  if (id.includes("claude") || id.startsWith("anthropic/")) {
    return <Claude.Color size={size} className={className} />;
  }
  if (id.includes("gpt") || id.startsWith("openai/") || id.includes("o1") || id.includes("o3")) {
    return <OpenAI size={size} className={className} />;
  }
  if (id.includes("gemini") || id.startsWith("google/")) {
    return <Gemini.Color size={size} className={className} />;
  }
  if (id.includes("deepseek")) {
    return <DeepSeek.Color size={size} className={className} />;
  }
  if (id.includes("llama") || id.startsWith("meta/") || id.startsWith("meta-llama/")) {
    return <Meta.Color size={size} className={className} />;
  }
  if (id.includes("mistral") || id.includes("mixtral") || id.startsWith("mistralai/")) {
    return <Mistral.Color size={size} className={className} />;
  }
  if (id.includes("qwen")) {
    return <Qwen.Color size={size} className={className} />;
  }
  if (id.includes("cohere") || id.includes("command")) {
    return <Cohere.Color size={size} className={className} />;
  }
  if (id.includes("grok") || id.startsWith("x-ai/")) {
    return <XAI size={size} className={className} />;
  }
  if (id.includes("minimax")) {
    return <Minimax.Color size={size} className={className} />;
  }
  if (id.includes("perplexity") || id.includes("sonar")) {
    return <Perplexity.Color size={size} className={className} />;
  }

  return <OpenRouter size={size} className={className} />;
}
