"use client";

import { useChat } from "@ai-sdk/react";
import {
  isTextUIPart,
  isReasoningUIPart,
  isFileUIPart,
  isToolUIPart,
  type DynamicToolUIPart,
  type FileUIPart,
  type UIMessage,
} from "ai";
import { useEffect, useState } from "react";
import AI_Input_Search from "@/components/kokonutui/ai-input-search";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanAction,
  PlanTrigger,
  PlanContent,
} from "@/components/ai-elements/plan";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtContent,
} from "@/components/ai-elements/chain-of-thought";
import {
  ToolCallsSection,
  type ToolCallEntry,
} from "@/components/ui/tool-calls-section";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { Attachments, Attachment } from "@/components/ai-elements/attachments";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import {
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Truck,
  ArrowRight,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { AgentOrb } from "@/components/ai/agent-orb";

/** Default provider (OpenRouter preferred when API key is present). */
const DEFAULT_PROVIDER = "openrouter";

/**
 * Convert raw File[] (from the kokonutui file picker) into FileUIPart[]
 * that the AI SDK uses for message attachments.
 *
 * This mirrors the official `convertFileListToFileUIParts` helper that the
 * AI SDK uses internally when a `FileList` is passed to `sendMessage`.
 */
async function filesToFileUIParts(files: File[]): Promise<FileUIPart[]> {
  return Promise.all(
    files.map(async (file) => {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return {
        type: "file" as const,
        mediaType: file.type || "application/octet-stream",
        filename: file.name,
        url,
      };
    })
  );
}

function CopyButton({ message }: { message: UIMessage }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = message.parts
      .filter((p) => isTextUIPart(p))
      .map((p) => (p as { text: string }).text)
      .join("\n");
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <MessageAction
      tooltip={copied ? "Copied to clipboard" : "Copy response"}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Copy className="size-3.5 text-muted-foreground" />
      )}
    </MessageAction>
  );
}

/** Render a single UIMessagePart using the appropriate AI Element component. */
function renderPart(
  message: UIMessage,
  part: UIMessage["parts"][number],
  index: number
): React.ReactNode {
  if (isTextUIPart(part)) {
    return (
      <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
    );
  }

  if (isReasoningUIPart(part)) {
    return (
      <ChainOfThought
        key={`${message.id}-reasoning-${index}`}
        defaultOpen={part.state === "streaming"}
        className="my-1.5"
      >
        <ChainOfThoughtHeader>
          {part.state === "streaming" ? "Thinking…" : "Thought process"}
        </ChainOfThoughtHeader>
        <ChainOfThoughtContent>
          <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground/90 pl-5 border-l-2 border-border/60">
            {part.text}
          </div>
        </ChainOfThoughtContent>
      </ChainOfThought>
    );
  }

  if (isFileUIPart(part)) {
    return (
      <Attachments key={`${message.id}-file-${index}`}>
        <Attachment data={{ ...part, id: `${message.id}-${index}` }} />
      </Attachments>
    );
  }

  if (isToolUIPart(part)) {
    const toolPart = part as unknown as ToolPart;
    const key = `${message.id}-tool-${index}`;
    const dynamic = part as unknown as DynamicToolUIPart;
    const toolName = (dynamic.toolName ||
      (toolPart as any).toolName ||
      toolPart.type) as string;
    const input = (dynamic.input ?? (toolPart as any).input) as any;
    const output = (dynamic.output ?? (toolPart as any).output) as any;
    const isRunning =
      toolPart.state === "input-streaming" ||
      toolPart.state === "input-available";

    // 1. Dynamic Plan Rendering using official <Plan> AI Element
    if (toolName === "createExecutionPlan") {
      const planSteps = output?.steps ?? input?.steps ?? [];
      const planGoal =
        output?.goal ?? input?.goal ?? "Operational Execution Plan";
      return (
        <Plan
          key={key}
          className="my-2 border border-brand-accent/20 bg-brand-card/60 rounded-xl"
          isStreaming={isRunning}
        >
          <PlanHeader>
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-brand-accent" />
              <div>
                <PlanTitle>{planGoal}</PlanTitle>
                <PlanDescription>
                  Autonomous Multi-Agent Task Orchestration
                </PlanDescription>
              </div>
            </div>
            <PlanAction>
              <PlanTrigger />
            </PlanAction>
          </PlanHeader>
          <PlanContent className="pt-2">
            <div className="space-y-2">
              {planSteps.map((step: any, sIdx: number) => (
                <div
                  key={step.id || sIdx}
                  className="flex items-center justify-between rounded-lg border border-brand-rule/60 bg-brand-cream/30 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span className="font-medium text-brand-ink">
                      {step.title}
                    </span>
                  </div>
                  <span className="rounded-md bg-brand-accent/10 px-2 py-0.5 text-[10px] font-medium text-brand-accent">
                    {step.assignedAgent}
                  </span>
                </div>
              ))}
            </div>
          </PlanContent>
        </Plan>
      );
    }

    // 2. Draft Load Interactive Card
    if (toolName === "draftLoad") {
      const load = output ?? input;
      return (
        <div
          key={key}
          className="my-2 rounded-xl border border-brand-accent/25 bg-gradient-to-br from-brand-accent/5 to-transparent p-3.5 text-xs space-y-2.5 max-w-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-brand-accent" />
              <span className="font-semibold text-brand-ink">
                Load Draft {load?.draftId ?? ""}
              </span>
            </div>
            <span className="rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5 text-[10px] font-medium">
              Requires Dispatch Approval
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-brand-card p-2.5 border border-brand-rule">
            <div>
              <div className="text-[9px] text-brand-muted-soft uppercase tracking-wider">
                Origin
              </div>
              <div className="font-semibold text-xs text-brand-ink">
                {load?.origin}
              </div>
            </div>
            <ArrowRight className="size-3.5 text-brand-muted-soft" />
            <div>
              <div className="text-[9px] text-brand-muted-soft uppercase tracking-wider">
                Destination
              </div>
              <div className="font-semibold text-xs text-brand-ink">
                {load?.destination}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-brand-muted-soft uppercase tracking-wider">
                Rate
              </div>
              <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                {load?.rate}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. All other tool calls rendered via ToolCallsSection
    const toolCategory = toolName.includes("rate")
      ? "rate_auditor"
      : toolName.includes("driver") || toolName.includes("fleet")
      ? "fleet"
      : toolName.includes("plan")
      ? "plan"
      : toolName.includes("draft")
      ? "dispatch"
      : toolName.includes("email")
      ? "gmail"
      : toolName.includes("calendar")
      ? "calendar"
      : toolName.includes("search")
      ? "search"
      : "general";

    const entry: ToolCallEntry = {
      tool_name: toolName,
      tool_category: toolCategory,
      message:
        toolName === "delegateSubtask"
          ? `Sub-agent (${input?.agentRole || "Specialist"}): ${input?.subtaskTitle || "Task Execution"}`
          : toolName === "checkFleetAvailability"
          ? `Checked fleet trucks in ${input?.location || "target corridor"}`
          : `Executed ${toolName.replace(/([A-Z])/g, " $1").toLowerCase()}`,
      inputs: input,
      output:
        output?.findings || output?.result || output?.message || output,
    };

    return (
      <ToolCallsSection
        key={key}
        toolCalls={[entry]}
        defaultExpanded={isRunning}
      />
    );
  }

  return null;
}

import type { AIModelItem } from "@/components/ai/model-picker";

export default function ChatInterface() {
  const [provider, setProvider] = useState<string>(DEFAULT_PROVIDER);
  const [availableModels, setAvailableModels] = useState<AIModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    id: "ai-chat",
  });

  // Fetch all dynamically available models from provider on mount
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: { provider?: string; models: AIModelItem[] }) => {
        if (data.provider) {
          setProvider(data.provider);
        }
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          // Default to Claude 3.5 Sonnet, GPT-4o Mini, or first model in list
          const preferred =
            data.models.find((m) => m.id.includes("claude-3.5-sonnet"))?.id ||
            data.models.find((m) => m.id.includes("gpt-4o-mini"))?.id ||
            data.models[0].id;
          setSelectedModel(preferred);
        }
      })
      .catch((err) => {
        console.error("Failed to load models:", err);
      });
  }, []);

  const sendWithProvider = (
    text: string,
    options: { webSearch: boolean; model: string | null }
  ) => {
    sendMessage(
      { text },
      {
        body: {
          provider,
          model: options.model ?? selectedModel,
          webSearch: options.webSearch,
        },
      }
    );
  };

  const handleFiles = (files: File[]) => {
    filesToFileUIParts(files).then((fileParts) => {
      sendMessage(
        { files: fileParts },
        {
          body: {
            provider,
            model: selectedModel,
          },
        }
      );
    });
  };

  const handleSuggestionClick = (text: string) => {
    sendWithProvider(text, { webSearch: false, model: selectedModel });
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {error && (
          <div className="mb-4 w-full max-w-2xl rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error.message}
          </div>
        )}

        <div className="w-full max-w-2xl text-center mb-6 space-y-1.5">
          <AgentOrb
            size="lg"
            state={status === "submitted" || status === "streaming" ? "thinking" : "idle"}
            className="mb-3 mx-auto"
          />
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-brand-ink">
            What can I help you dispatch today?
          </h1>
          <p className="text-xs text-brand-muted-soft max-w-md mx-auto">
            Autonomous freight intelligence, rate confirmation analysis, FMCSA safety checks, and load dispatching.
          </p>
        </div>

        {/* Centered AI Input with Live Model Picker */}
        <div className="w-full max-w-2xl">
          <AI_Input_Search
            models={availableModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onSubmit={sendWithProvider}
            onFilesSelected={handleFiles}
            placeholder="Ask anything, draft a load, or paste rate con details..."
            searchLabel="Web Search"
          />
        </div>

        {/* Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-2xl px-2">
          {[
            "Draft load from rate confirmation",
            "FMCSA HOS 34-hour restart rules",
            "Calculate break-even cost per mile",
            "Find available trucks in Midwest",
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              onClick={() => handleSuggestionClick(promptText)}
              className="rounded-full border border-brand-rule bg-brand-card px-3 py-1.5 text-xs text-brand-muted-soft transition-colors hover:border-brand-accent/40 hover:text-brand-ink hover:bg-brand-cream/50 shadow-2xs"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive shrink-0">
          {error.message}
        </div>
      )}

      {/* Message list with auto-scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <Conversation>
          <ConversationContent className="max-w-2xl mx-auto w-full px-4 py-4 gap-4">
            {messages.map((message, mIdx) => {
              const isLastMessage = mIdx === messages.length - 1;
              const isAssistant = message.role === "assistant";
              return (
                <Message key={message.id} from={message.role} className="gap-1.5">
                  {isAssistant && (
                    <div className="flex items-center gap-2 mb-0.5 select-none">
                      <AgentOrb
                        size="xs"
                        state={
                          isLastMessage &&
                          (status === "submitted" || status === "streaming")
                            ? "streaming"
                            : "idle"
                        }
                      />
                      <span className="text-xs font-medium text-brand-ink/90">
                        Muvx
                      </span>
                    </div>
                  )}
                  <MessageContent>
                    {message.parts.map((part, i) =>
                      renderPart(message, part, i)
                    )}
                  </MessageContent>
                  {isAssistant && (
                    <MessageToolbar className="mt-1">
                      <MessageActions>
                        <CopyButton message={message} />
                      </MessageActions>
                    </MessageToolbar>
                  )}
                </Message>
              );
            })}

            {/* Thinking indicator while the model is preparing a response */}
            {status === "submitted" && (
              <Message from="assistant" className="gap-1.5">
                <div className="flex items-center gap-2 mb-0.5 select-none">
                  <AgentOrb size="xs" state="thinking" />
                  <span className="text-xs font-medium text-brand-ink/90">
                    Muvx
                  </span>
                </div>
                <MessageContent>
                  <Shimmer duration={2}>Thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input container: clean, compact, centered */}
      <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pb-4 pt-1">
        <AI_Input_Search
          models={availableModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onSubmit={sendWithProvider}
          onFilesSelected={handleFiles}
          placeholder="Ask a follow up question..."
          searchLabel="Web Search"
        />
      </div>
    </div>
  );
}
