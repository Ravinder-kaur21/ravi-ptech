"use client";

/**
 * @author: @kokonutui
 * @description: AI Input Search (with integrated model selector)
 * @version: 1.1.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Globe, Paperclip, Send, FileText, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ModelPicker, type AIModelItem } from "@/components/ai/model-picker";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Short, human-readable label derived from a model ID like "deepseek-ai/deepseek-v4.1-flash". */
function formatModelLabel(model: string): string {
  return (model.split("/").pop() || model)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface AIInputSearchProps {
  placeholder?: string;
  searchLabel?: string;
  /** Available models (IDs or rich items) to show in the selector. */
  models: (string | AIModelItem)[];
  /** Currently selected model (controlled). */
  selectedModel: string;
  /** Called when the user picks a different model. */
  onModelChange: (model: string) => void;
  /** Receives the text, web-search flag, selected model, and staged files. */
  onSubmit?: (
    value: string,
    options: { webSearch: boolean; model: string | null; files?: File[] }
  ) => void;
  /** Called with the files picked through the attach button. */
  onFilesSelected?: (files: File[]) => void;
  /** Controlled web-search state. Leave unset to let the component own it. */
  webSearch?: boolean;
  defaultWebSearch?: boolean;
  onWebSearchChange?: (webSearch: boolean) => void;
  className?: string;
}

export default function AI_Input_Search({
  placeholder = "Search the web...",
  searchLabel = "Search",
  models = [],
  selectedModel = "",
  onModelChange,
  onSubmit,
  onFilesSelected,
  webSearch: webSearchProp,
  defaultWebSearch = true,
  onWebSearchChange,
  className,
}: AIInputSearchProps) {
  const [value, setValue] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 52,
    maxHeight: 200,
  });
  const [uncontrolledWebSearch, setUncontrolledWebSearch] =
    useState(defaultWebSearch);
  const webSearch = webSearchProp ?? uncontrolledWebSearch;
  const shouldReduceMotion = useReducedMotion();

  const toggleWebSearch = () => {
    const next = !webSearch;
    if (webSearchProp === undefined) {
      setUncontrolledWebSearch(next);
    }
    onWebSearchChange?.(next);
  };

  const handleSubmit = () => {
    if (!value.trim() && stagedFiles.length === 0) {
      return;
    }
    onSubmit?.(value, {
      webSearch,
      model: selectedModel,
      files: stagedFiles.length > 0 ? stagedFiles : undefined,
    });
    setValue("");
    setStagedFiles([]);
    adjustHeight(true);
  };

  // Mouse convenience: clicking the box around the field focuses it. Clicks
  // on the controls keep their own behaviour.
  const handleContainerClick = (target: EventTarget) => {
    if (target instanceof Element && target.closest("button, label, input")) {
      return;
    }
    textareaRef.current?.focus();
  };

  const handleAddFiles = (files: File[]) => {
    setStagedFiles((prev) => [...prev, ...files]);
    onFilesSelected?.(files);
  };

  const canSubmit = value.trim().length > 0 || stagedFiles.length > 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative mx-auto w-full max-w-2xl px-4 sm:px-0">
        {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents lint/a11y/noNoninteractiveElementInteractions: pointer-only shortcut; the textarea and buttons inside are keyboard reachable */}
        <div
          className={cn(
            "relative flex w-full cursor-text flex-col rounded-2xl text-left transition-all duration-200 border border-brand-rule bg-brand-card shadow-xs",
            "has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-brand-accent/20 has-[textarea:focus-visible]:border-brand-accent/40",
            isDragging && "ring-2 ring-brand-accent/40 border-brand-accent bg-brand-cream/40"
          )}
          onClick={(e) => handleContainerClick(e.target)}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = Array.from(e.dataTransfer.files ?? []);
            if (dropped.length > 0) {
              handleAddFiles(dropped);
            }
          }}
        >
          <Textarea
            aria-label={placeholder}
            className="min-h-[56px] w-full resize-none rounded-2xl rounded-b-none border-none bg-transparent px-4 py-3.5 text-sm leading-relaxed placeholder:text-brand-muted-soft focus-visible:ring-0 text-brand-ink outline-none"
            onChange={(e) => {
              setValue(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            ref={textareaRef}
            value={value}
          />

          {/* Staged Attached Files Preview Chips */}
          {stagedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-2 pt-0.5">
              {stagedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-cream/80 border border-brand-rule px-2.5 py-1 text-xs text-brand-ink animate-in fade-in zoom-in-95 duration-150"
                >
                  <FileText className="size-3.5 text-brand-accent shrink-0" />
                  <span className="max-w-[160px] truncate font-medium text-[11px]">{file.name}</span>
                  <span className="text-[10px] text-brand-muted-soft font-mono">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-brand-muted-soft hover:text-brand-ink p-0.5 rounded transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-b-2xl bg-brand-cream/30 px-3 pt-1.5 pb-2.5 border-t border-brand-rule/60">
            <div className="flex items-center gap-2">
              {/* Model selector with authentic Lobehub icons */}
              <ModelPicker
                models={models.map((m) =>
                  typeof m === "string" ? { id: m, name: formatModelLabel(m) } : m
                )}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                disabled={models.length === 0}
              />

              <label className="group/attach cursor-pointer rounded-lg bg-black/5 p-2 transition-transform has-focus-visible:ring-2 has-focus-visible:ring-sky-600 motion-safe:active:scale-[0.97] dark:bg-white/5 dark:has-focus-visible:ring-sky-500">
                <input
                  aria-label="Attach file"
                  className="sr-only"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    // Clear so picking the same file again still fires onChange.
                    e.target.value = "";
                    if (files.length > 0) {
                      handleAddFiles(files);
                    }
                  }}
                  multiple
                  type="file"
                />
                <Paperclip className="h-4 w-4 text-black/40 transition-colors group-hover/attach:text-black dark:text-white/40 dark:group-hover/attach:text-white" />
              </label>
              <button
                aria-label={searchLabel}
                aria-pressed={webSearch}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-2 rounded-full border px-1.5 py-1 transition-[color,background-color,border-color,scale]",
                  webSearch
                    ? "border-sky-400 bg-sky-500/15 text-sky-500"
                    : "border-transparent bg-black/5 text-black/40 hover:text-black dark:bg-white/5 dark:text-white/40 dark:hover:text-white",
                  "motion-safe:active:scale-[0.97]"
                )}
                onClick={toggleWebSearch}
                type="button"
              >
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <motion.div
                    transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : { rotate: 15, scale: 1.1 }
                    }
                  >
                    <Globe
                      className={cn(
                        "h-4 w-4",
                        webSearch ? "text-sky-500" : "text-inherit"
                      )}
                    />
                  </motion.div>
                </div>
                <AnimatePresence initial={false}>
                  {webSearch && (
                    <motion.span
                      animate={{
                        width: "auto",
                        opacity: 1,
                      }}
                      className="shrink-0 overflow-hidden whitespace-nowrap text-sky-500 text-sm"
                      exit={{
                        width: 0,
                        opacity: 0,
                        transition: { duration: 0.15, ease: EASE_OUT },
                      }}
                      initial={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                    >
                      {searchLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <button
              aria-label="Send"
              className={cn(
                "rounded-lg p-2 transition-[color,background-color,scale] motion-safe:active:scale-[0.97]",
                canSubmit
                  ? "cursor-pointer bg-sky-500/15 text-sky-500"
                  : "bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40"
              )}
              disabled={!canSubmit}
              onClick={handleSubmit}
              type="button"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
