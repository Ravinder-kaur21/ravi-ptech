"use client";

/**
 * JsonViewer — collapsible tree-view for JSON tool output.
 *
 * Up to `maxDepth` levels expand on click; deeper levels collapse to a
 * "[N keys]" footer so logs stay readable.
 */

import { useState, useMemo } from "react";
import { ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  maxDepth?: number;
  className?: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function JsonValue({
  value,
  depth,
  maxDepth,
}: {
  value: unknown;
  depth: number;
  maxDepth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (value === null) {
    return <span className="italic text-brand-muted-soft">null</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-brand-accent">{String(value)}</span>;
  }

  if (typeof value === "number") {
    return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  }

  if (typeof value === "string") {
    const display = value.length > 200 ? `${value.slice(0, 200)}…` : value;
    return <span className="text-emerald-700 dark:text-emerald-400">&quot;{display}&quot;</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-brand-muted-soft">[]</span>;
    if (depth >= maxDepth) {
      return <span className="text-brand-muted-soft">[{value.length} items]</span>;
    }
    return (
      <span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 text-brand-muted hover:text-brand-ink"
        >
          <ChevronRight
            className={cn("size-3 transition-transform", expanded && "rotate-90")}
          />
          <span className="text-[11px]">[{value.length}]</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-brand-rule/50 pl-2">
            {value.map((item, i) => (
              <div key={i} className="py-0.5">
                <span className="mr-1 text-[10px] text-brand-muted-soft/60">{i}:</span>
                <JsonValue value={item} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-brand-muted-soft">{"{}"}</span>;
    if (depth >= maxDepth) {
      return (
        <span className="text-brand-muted-soft">{`{${entries.length} keys}`}</span>
      );
    }

    return (
      <span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-0.5 text-brand-muted hover:text-brand-ink"
        >
          <ChevronRight
            className={cn("size-3 transition-transform", expanded && "rotate-90")}
          />
          <span className="text-[10px]">{`{${entries.length}}`}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-brand-rule/50 pl-2">
            {entries.map(([k, v]) => (
              <div key={k} className="py-0.5">
                <span className="mr-1 font-mono text-[11px] text-purple-600 dark:text-purple-400">
                  {k}:
                </span>
                <JsonValue value={v} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span className="text-brand-muted-soft">{String(value)}</span>;
}

export function JsonViewer({ data, maxDepth = 4, className }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <div
      className={cn(
        "group/json relative rounded-lg border border-brand-rule/60 bg-brand-cream-soft/40 p-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(formatted);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] text-brand-muted opacity-0 transition-opacity hover:bg-brand-cream group-hover/json:opacity-100"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
      <div className="font-mono text-[12px] leading-relaxed text-brand-ink">
        <JsonValue value={data} depth={0} maxDepth={maxDepth} />
      </div>
    </div>
  );
}
