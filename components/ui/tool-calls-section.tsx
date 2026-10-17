"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Wrench,
  Mail,
  Calendar,
  Terminal,
  Code,
  Users,
  Truck,
  ShieldCheck,
  Calculator,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ToolCallEntry {
  /** Name of the tool that was called */
  tool_name: string;
  /** Category/integration the tool belongs to (e.g., "gmail", "search", "fleet", "rate_con") */
  tool_category: string;
  /** Human-readable message describing what the tool did */
  message?: string;
  /** Whether to show the category label (default: true) */
  show_category?: boolean;
  /** Unique ID for this tool call */
  tool_call_id?: string;
  /** Input parameters passed to the tool */
  inputs?: Record<string, unknown>;
  /** Output/result from the tool */
  output?: unknown;
  /** URL to custom icon for integrations */
  icon_url?: string;
  /** Friendly name for the integration (e.g., "Linear", "Gmail", "Fleet Guardian") */
  integration_name?: string;
}

export interface IntegrationInfo {
  iconUrl?: string;
  name?: string;
}

export interface ToolCallsSectionProps {
  /** Array of tool call entries to display */
  toolCalls: ToolCallEntry[];
  /** Optional map of integration IDs to their info for icon/name lookup */
  integrations?: Map<string, IntegrationInfo>;
  /** Maximum number of icons to show in the stacked display (default: 10) */
  maxIconsToShow?: number;
  /** Whether to start with the accordion expanded (default: false) */
  defaultExpanded?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Custom icon size (default: 16) */
  iconSize?: number;
  /** Custom icon renderer override */
  renderIcon?: (call: ToolCallEntry, size: number) => ReactNode;
  /** Custom content renderer override for inputs/outputs */
  renderContent?: (content: unknown) => ReactNode;
}

// ============================================================================
// Category Icon Lookup
// ============================================================================

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gmail: Mail,
  email: Mail,
  google_calendar: Calendar,
  calendar: Calendar,
  executor: Terminal,
  code: Code,
  analysis: Search,
  search: Search,
  handoff: Users,
  fleet: Truck,
  dispatch: Truck,
  safety: ShieldCheck,
  fmcsa: ShieldCheck,
  rate_con: Calculator,
  rate_auditor: Calculator,
  plan: Layers,
  orchestrator: Sparkles,
  general: Wrench,
};

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ============================================================================
// Main Component
// ============================================================================

export function ToolCallsSection({
  toolCalls,
  integrations,
  maxIconsToShow = 10,
  defaultExpanded = false,
  className,
  iconSize = 15,
  renderIcon,
  renderContent,
}: ToolCallsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());

  const integrationLookup = useMemo(() => {
    if (integrations) return integrations;
    return new Map<string, IntegrationInfo>();
  }, [integrations]);

  const getIntegrationName = (call: ToolCallEntry): string | undefined => {
    if (call.integration_name) return call.integration_name;
    const integration = integrationLookup.get(call.tool_category);
    return integration?.name;
  };

  const toggleCallExpansion = (index: number) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (!toolCalls || toolCalls.length === 0) return null;

  // Default icon renderer
  const defaultRenderIcon = (call: ToolCallEntry, size: number) => {
    const category = (call.tool_category || "general").toLowerCase();
    const IconComponent = CATEGORY_ICONS[category] || Wrench;
    return (
      <div className="size-7 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
        <IconComponent size={size} />
      </div>
    );
  };

  const iconRenderer = renderIcon || defaultRenderIcon;

  // Default content renderer
  const defaultRenderContent = (content: unknown) => {
    if (!content) return null;
    if (typeof content === "string") {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }
    return (
      <pre className="overflow-x-auto text-[10px] leading-relaxed font-mono text-zinc-700 dark:text-zinc-300">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  const contentRenderer = renderContent || defaultRenderContent;

  // Render stacked rotated icons
  const renderStackedIcons = () => {
    const seenCategories = new Set<string>();
    const uniqueIcons = toolCalls.filter((call) => {
      const category = call.tool_category || "general";
      if (seenCategories.has(category)) return false;
      seenCategories.add(category);
      return true;
    });
    const displayIcons = uniqueIcons.slice(0, maxIconsToShow);

    return (
      <div className="flex min-h-7 items-center -space-x-1.5">
        {displayIcons.map((call, index) => (
          <div
            key={`${call.tool_name}-${index}`}
            className="relative flex items-center justify-center transition-transform hover:scale-105"
            style={{
              transform:
                displayIcons.length > 1
                  ? `rotate(${index % 2 === 0 ? "6deg" : "-6deg"})`
                  : "none",
              zIndex: index,
            }}
          >
            {iconRenderer(call, iconSize)}
          </div>
        ))}
        {uniqueIcons.length > maxIconsToShow && (
          <div className="z-10 flex size-6 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium border border-zinc-300/50 dark:border-zinc-700">
            +{uniqueIcons.length - maxIconsToShow}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("w-full max-w-xl my-2", className)}>
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors select-none group"
      >
        {renderStackedIcons()}
        <span className="text-xs font-medium tracking-tight">
          Used {toolCalls.length} tool{toolCalls.length > 1 ? "s" : ""}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "transition-transform duration-200 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isExpanded ? "max-h-[3000px] opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-0.5 pl-2">
          {toolCalls.map((call, index) => {
            const hasCategoryText =
              call.show_category !== false &&
              call.tool_category &&
              call.tool_category !== "unknown";
            const hasDetails = Boolean(call.inputs || call.output);
            const isCallExpanded = expandedCalls.has(index);

            return (
              <div
                key={`${call.tool_name}-step-${index}`}
                className="flex items-stretch gap-2.5"
              >
                {/* Icon column with connector line */}
                <div className="flex flex-col items-center self-stretch">
                  <div className="size-7 flex items-center justify-center shrink-0">
                    {iconRenderer(call, iconSize)}
                  </div>
                  {index < toolCalls.length - 1 && (
                    <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-800 min-h-3" />
                  )}
                </div>

                {/* Content column */}
                <div className="flex-1 min-w-0 pb-3">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 text-left w-full",
                      hasDetails ? "cursor-pointer group/title" : "cursor-default"
                    )}
                    onClick={() => hasDetails && toggleCallExpansion(index)}
                  >
                    <p
                      className={cn(
                        "text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate",
                        hasDetails &&
                          "group-hover/title:text-zinc-950 dark:group-hover/title:text-white"
                      )}
                    >
                      {call.message || formatToolName(call.tool_name)}
                    </p>
                    {hasDetails && (
                      <ChevronDown
                        size={12}
                        className={cn(
                          "transition-transform duration-150 text-zinc-400 shrink-0",
                          isCallExpanded && "rotate-180"
                        )}
                      />
                    )}
                  </button>

                  {hasCategoryText && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize tracking-tight">
                      {getIntegrationName(call) ||
                        call.tool_category
                          .replace(/_/g, " ")
                          .split(" ")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() +
                              word.slice(1).toLowerCase()
                          )
                          .join(" ")}
                    </p>
                  )}

                  {isCallExpanded && hasDetails && (
                    <div className="mt-2 space-y-2 text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 rounded-lg p-2.5 w-full max-w-md">
                      {call.inputs && Object.keys(call.inputs).length > 0 && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
                            Inputs
                          </span>
                          {contentRenderer(call.inputs)}
                        </div>
                      )}
                      {call.output !== undefined && call.output !== null && (
                        <div className="flex flex-col pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider mb-0.5">
                            Output
                          </span>
                          {contentRenderer(call.output)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ToolCallsSection;
