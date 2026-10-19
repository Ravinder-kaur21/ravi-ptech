"use client";

/**
 * @author: @kokonutui
 * @description: AI Prompt Input (with integrated Muvx model selector)
 * @version: 1.1.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Paperclip,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import React, { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { ModelPicker, type AIModelItem } from "@/components/ai/model-picker";
import { cn } from "@/lib/utils";

// Decorative: each icon sits next to the model name, which carries the label.
const OPENAI_ICON = (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height="1em"
    preserveAspectRatio="xMidYMid"
    viewBox="0 0 256 260"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
  </svg>
);

function GeminiIcon() {
  const gradientId = useId();

  return (
    <svg
      aria-hidden="true"
      height="1em"
      style={{ flex: "none", lineHeight: "1" }}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          x2="68.73%"
          y1="100%"
          y2="30.395%"
        >
          <stop offset="0%" stopColor="#1C7DFF" />
          <stop offset="52.021%" stopColor="#1C69FF" />
          <stop offset="100%" stopColor="#F0DCD6" />
        </linearGradient>
      </defs>
      <path
        d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
        fill={`url(#${gradientId})`}
        fillRule="nonzero"
      />
    </svg>
  );
}

const ANTHROPIC_ICON = (
  <svg
    aria-hidden="true"
    fill="currentColor"
    fillRule="evenodd"
    height="1em"
    style={{ flex: "none", lineHeight: "1" }}
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
  </svg>
);

const MODEL_ICONS: Record<string, ReactNode> = {
  "GPT-5.6 Mini": OPENAI_ICON,
  "Gemini 3 Pro": <GeminiIcon />,
  "Claude Fable 5": ANTHROPIC_ICON,
  "GPT-5.6 Codex": OPENAI_ICON,
  "GPT-5.6": OPENAI_ICON,
};

const getModelIcon = (model: string) =>
  MODEL_ICONS[model] ?? (
    <Bot aria-hidden="true" className="h-4 w-4 opacity-50" />
  );

export interface AIPromptProps {
  /** Available models (either list of strings or rich AIModelItem objects). */
  models?: (string | AIModelItem)[];
  /** Controlled currently selected model ID. */
  selectedModel?: string;
  defaultModel?: string;
  /** Callback when user changes the model in the selector. */
  onModelChange?: (model: string) => void;
  placeholder?: string;
  headerText?: string;
  headerAction?: string;
  onSubmit?: (
    value: string,
    options?: { webSearch?: boolean; model?: string; files?: File[] }
  ) => void;
  /** Called with the files picked from the attach button. */
  onAttach?: (files: FileList) => void;
  onFilesSelected?: (files: File[]) => void;
  className?: string;
}

const DEFAULT_MODELS = [
  "Gemini 3 Pro",
  "GPT-5.6 Mini",
  "Claude Fable 5",
  "GPT-5.6 Codex",
  "GPT-5.6",
];

export default function AI_Prompt({
  models = DEFAULT_MODELS,
  selectedModel: controlledSelectedModel,
  defaultModel = "gemini-2.5-flash",
  onModelChange,
  placeholder = "Message Muvx Copilot...",
  headerText = "Muvx AI Intelligence",
  headerAction = "Enterprise Dispatch Ready",
  onSubmit,
  onAttach,
  onFilesSelected,
  className,
}: AIPromptProps) {
  const [value, setValue] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 68,
    maxHeight: 280,
  });

  // Extract model strings if models is array of AIModelItem
  const richModels = React.useMemo<AIModelItem[]>(() => {
    return models.map((m) => {
      if (typeof m === "string") {
        return {
          id: m,
          name: (m.split("/").pop() || m)
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        };
      }
      return m;
    });
  }, [models]);

  const [uncontrolledModel, setUncontrolledModel] = useState(() => {
    if (richModels.some((m) => m.id === defaultModel)) return defaultModel;
    return richModels[0]?.id ?? defaultModel;
  });

  const activeModel = controlledSelectedModel ?? uncontrolledModel;

  const handleModelSelect = (mId: string) => {
    if (controlledSelectedModel === undefined) {
      setUncontrolledModel(mId);
    }
    onModelChange?.(mId);
  };

  const textareaId = useId();
  const shouldReduceMotion = useReducedMotion();
  const labelOffset = shouldReduceMotion ? 0 : 5;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onAttach?.(files);
    const newFiles = Array.from(files);
    setStagedFiles((prev) => [...prev, ...newFiles]);
    onFilesSelected?.(newFiles);
  };

  const removeStagedFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (!(value.trim() || stagedFiles.length > 0)) {
      return;
    }
    onSubmit?.(value, {
      model: activeModel,
      files: stagedFiles.length > 0 ? stagedFiles : undefined,
    });
    setValue("");
    setStagedFiles([]);
    adjustHeight(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter during IME composition confirms the candidate; it must not submit.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  // Determine if we should use the rich ModelPicker (if onModelChange is provided or rich items exist)
  const useRichModelPicker = Boolean(onModelChange || richModels.length > 0);

  return (
    <div className={cn("w-full py-2", className)}>
      <div className="rounded-2xl border border-brand-rule/80 bg-brand-card/90 shadow-sm backdrop-blur-xs p-1.5 pt-3 transition-colors hover:border-brand-rule">
        {/* Header row: KokonutUI prompt banner */}
        <div className="mx-2 mb-2 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
              <Sparkles className="size-2.5" />
            </span>
            <p className="font-mono text-[11px] font-medium tracking-[0.02em] text-brand-ink/80">
              {headerText}
            </p>
          </div>
          {headerAction && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-muted-soft">
              {headerAction}
            </p>
          )}
        </div>

        {/* Textarea container */}
        <div className="flex flex-col rounded-xl has-[textarea:focus-visible]:ring-1 has-[textarea:focus-visible]:ring-brand-accent/60">
          <label className="sr-only" htmlFor={textareaId}>
            Message
          </label>
          <Textarea
            className={cn(
              "w-full resize-none rounded-xl rounded-b-none border-none bg-brand-cream/35 px-4 py-3 placeholder:text-brand-muted-soft focus-visible:ring-0 focus-visible:ring-offset-0 text-brand-ink text-sm",
              "min-h-[68px]"
            )}
            id={textareaId}
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={textareaRef}
            value={value}
          />

          {/* Staged file attachments preview */}
          {stagedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 py-1.5 bg-brand-cream/35 border-t border-brand-rule/40">
              {stagedFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-card border border-brand-rule text-xs text-brand-ink/80 shadow-2xs"
                >
                  <FileText className="size-3 text-brand-accent" />
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeStagedFile(i)}
                    className="p-0.5 hover:text-red-500 rounded"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer toolbar: model picker, attach button, submit button */}
          <div className="flex h-13 items-center justify-between rounded-b-xl bg-brand-cream/35 px-3 border-t border-brand-rule/40">
            <div className="flex items-center gap-2">
              {useRichModelPicker ? (
                <ModelPicker
                  models={richModels}
                  selectedModel={activeModel}
                  onModelChange={handleModelSelect}
                  className="h-7 text-xs bg-brand-card/90 border-brand-rule hover:bg-brand-card text-brand-ink"
                />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        className="relative flex h-7 items-center gap-1 rounded-md pr-2 pl-1 text-xs hover:bg-brand-card focus-visible:ring-1 focus-visible:ring-brand-accent focus-visible:ring-offset-0 text-brand-ink"
                        variant="ghost"
                      />
                    }
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1"
                        exit={{ opacity: 0, y: labelOffset }}
                        initial={{ opacity: 0, y: -labelOffset }}
                        key={activeModel}
                        transition={{
                          duration: 0.15,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                      >
                        {getModelIcon(activeModel)}
                        <span className="font-medium">{activeModel}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </motion.div>
                    </AnimatePresence>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[10rem] border-brand-rule bg-brand-card p-1 shadow-md">
                    {richModels.map((m) => (
                      <DropdownMenuItem
                        className="flex items-center justify-between gap-2 text-xs cursor-pointer rounded-md"
                        key={m.id}
                        onSelect={() => handleModelSelect(m.id)}
                      >
                        <div className="flex items-center gap-2">
                          {getModelIcon(m.name)}
                          <span>{m.name}</span>
                        </div>
                        {activeModel === m.id && (
                          <Check className="h-3.5 w-3.5 text-brand-accent" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="mx-0.5 h-4 w-px bg-brand-rule/60" />

              {/* Attach files */}
              <label
                aria-label="Attach file"
                className={cn(
                  "cursor-pointer rounded-lg bg-brand-card/70 p-1.5",
                  "hover:bg-brand-card border border-brand-rule/50 hover:border-brand-rule text-brand-muted-soft hover:text-brand-ink",
                  "transition-all duration-150 active:scale-95",
                  "flex items-center justify-center"
                )}
                title="Attach load document, rate con, or screenshot"
              >
                <input
                  aria-label="Attach file"
                  className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)}
                  type="file"
                  multiple
                />
                <Paperclip className="h-3.5 w-3.5" />
              </label>
            </div>

            {/* Send button */}
            <button
              aria-label="Send message"
              className={cn(
                "rounded-lg p-2 transition-all duration-150 ease-out active:scale-95 disabled:pointer-events-none",
                value.trim() || stagedFiles.length > 0
                  ? "bg-brand-ink text-brand-cream hover:bg-brand-ink/90 shadow-2xs"
                  : "bg-brand-ink/10 text-brand-muted-soft opacity-40"
              )}
              disabled={!value.trim() && stagedFiles.length === 0}
              onClick={submit}
              type="button"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
