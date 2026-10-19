"use client";

import React, { useState, useMemo } from "react";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import { ModelIcon } from "@/components/ai/model-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AIModelItem {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  provider?: string;
}

export interface ModelPickerProps {
  models: AIModelItem[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelPicker({
  models = [],
  selectedModel,
  onModelChange,
  disabled = false,
  className,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const currentModel = useMemo(() => {
    return models.find((m) => m.id === selectedModel);
  }, [models, selectedModel]);

  const displayName = currentModel?.name || (selectedModel ? (selectedModel.split("/").pop() || selectedModel).replace(/[-_]/g, " ") : "Select Model");

  const filteredModels = useMemo(() => {
    let list = models;
    if (category !== "all") {
      list = list.filter((m) => {
        const id = m.id.toLowerCase();
        if (category === "anthropic") return id.includes("anthropic") || id.includes("claude");
        if (category === "openai") return id.includes("openai") || id.includes("gpt") || id.includes("o1") || id.includes("o3");
        if (category === "deepseek") return id.includes("deepseek");
        if (category === "meta") return id.includes("meta") || id.includes("llama");
        if (category === "google") return id.includes("google") || id.includes("gemini");
        return true;
      });
    }

    if (!search.trim()) return list;
    const query = search.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query)
    );
  }, [models, search, category]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled || models.length === 0}
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border border-black/10 bg-black/5 px-2.5 text-xs font-medium text-brand-ink transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 outline-none select-none max-w-[220px]",
              disabled && "opacity-50 pointer-events-none",
              className
            )}
          />
        }
      >
        <span className="shrink-0 flex items-center">
          <ModelIcon modelId={selectedModel} size={15} />
        </span>
        <span className="truncate">{displayName}</span>
        <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5 opacity-60" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[340px] sm:w-[400px] p-2 bg-popover rounded-xl shadow-xl border border-brand-rule"
      >
        {/* Search header */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 400+ models (Claude, GPT, DeepSeek...)"
            className="h-8 pl-8 text-xs bg-muted/40 border-none rounded-lg focus-visible:ring-1"
            autoFocus
          />
        </div>

        {/* Quick brand filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none text-[11px]">
          {[
            { id: "all", label: "All" },
            { id: "anthropic", label: "Anthropic" },
            { id: "openai", label: "OpenAI" },
            { id: "deepseek", label: "DeepSeek" },
            { id: "google", label: "Google" },
            { id: "meta", label: "Meta" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "px-2 py-0.5 rounded-full font-medium transition-colors shrink-0",
                category === c.id
                  ? "bg-brand-ink text-brand-cream dark:bg-white dark:text-black"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Model list */}
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {filteredModels.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No models match &quot;{search}&quot;
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = m.id === selectedModel;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onModelChange(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors group",
                    isSelected
                      ? "bg-brand-accent-tint/60 text-brand-ink"
                      : "hover:bg-muted/60 text-brand-ink dark:text-white"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="shrink-0 flex size-6 items-center justify-center rounded-md bg-white/80 dark:bg-zinc-800 shadow-2xs border border-black/5">
                      <ModelIcon modelId={m.id} size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{m.name}</span>
                        {m.context_length && m.context_length >= 128000 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-mono text-muted-foreground">
                            {Math.round(m.context_length / 1000)}k
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        {m.id}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="size-3.5 text-brand-accent shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
