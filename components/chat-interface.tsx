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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
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
      <Reasoning
        key={`${message.id}-reasoning-${index}`}
        isStreaming={part.state === "streaming"}
      >
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
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

    // 2. Sub-agent Delegation Card
    if (toolName === "delegateSubtask") {
      const agentRole =
        input?.agentRole ?? output?.agentRole ?? "Specialist Agent";
      const subtaskTitle =
        input?.subtaskTitle ?? output?.subtaskTitle ?? "Executing Subtask";
      const findings = output?.findings;

      return (
        <div
          key={key}
          className="my-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-brand-ink space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-sky-500" />
              <span className="font-semibold">{subtaskTitle}</span>
            </div>
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-mono font-medium text-sky-600 dark:text-sky-400">
              {agentRole}
            </span>
          </div>

          {findings && (
            <div className="mt-2 rounded-lg border border-brand-rule/40 bg-brand-card p-2.5 space-y-1 font-mono text-[11px]">
              {typeof findings === "object" ? (
                Object.entries(findings).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-brand-muted-soft capitalize">
                      {k.replace(/([A-Z])/g, " $1")}:
                    </span>
                    <span className="font-medium text-brand-ink text-right">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))
              ) : (
                <p>{String(findings)}</p>
              )}
            </div>
          )}
        </div>
      );
    }

    // 3. Draft Load Interactive Card
    if (toolName === "draftLoad") {
      const load = output ?? input;
      return (
        <div
          key={key}
          className="my-2 rounded-xl border border-brand-accent/25 bg-gradient-to-br from-brand-accent/5 to-transparent p-4 text-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-brand-accent" />
              <span className="font-semibold text-brand-ink">
                Load Draft {load?.draftId ?? ""}
              </span>
            </div>
            <span className="rounded-full bg-amber-500/15 text-amber-600 px-2.5 py-0.5 text-[10px] font-medium">
              Requires Dispatch Approval
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-brand-card p-3 border border-brand-rule">
            <div>
              <div className="text-[10px] text-brand-muted-soft uppercase tracking-wider">
                Origin
              </div>
              <div className="font-semibold text-sm text-brand-ink">
                {load?.origin}
              </div>
            </div>
            <ArrowRight className="size-4 text-brand-muted-soft" />
            <div>
              <div className="text-[10px] text-brand-muted-soft uppercase tracking-wider">
                Destination
              </div>
              <div className="font-semibold text-sm text-brand-ink">
                {load?.destination}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-brand-muted-soft uppercase tracking-wider">
                Agreed Rate
              </div>
              <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                {load?.rate}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default Tool rendering with official <Tool> AI Element
    if (toolPart.type === "dynamic-tool") {
      return (
        <Tool key={key}>
          <ToolHeader
            type={dynamic.type}
            state={dynamic.state}
            toolName={dynamic.toolName}
          />
          <ToolContent>
            {dynamic.input ? (
              <ToolInput input={dynamic.input as ToolPart["input"]} />
            ) : null}
            {dynamic.output ? (
              <ToolOutput
                output={dynamic.output as ToolPart["output"]}
                errorText={dynamic.errorText}
              />
            ) : null}
          </ToolContent>
        </Tool>
      );
    }

    return (
      <Tool key={key}>
        <ToolHeader type={toolPart.type} state={toolPart.state} />
        <ToolContent>
          {toolPart.input ? (
            <ToolInput input={toolPart.input as ToolPart["input"]} />
          ) : null}
          {toolPart.output ? (
            <ToolOutput
              output={toolPart.output as ToolPart["output"]}
              errorText={toolPart.errorText}
            />
          ) : null}
        </ToolContent>
      </Tool>
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
          <ConversationContent>
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1 select-none">
                    <AgentOrb
                      size="sm"
                      state={status === "streaming" ? "streaming" : "idle"}
                    />
                    <span className="text-xs font-semibold text-brand-ink">
                      Muvx Copilot
                    </span>
                    <span className="text-[10px] text-brand-muted-soft font-mono uppercase tracking-wider">
                      Autonomous Dispatcher
                    </span>
                  </div>
                )}
                <MessageContent>
                  {message.parts.map((part, i) =>
                    renderPart(message, part, i)
                  )}
                </MessageContent>
                {message.role === "assistant" && (
                  <MessageToolbar>
                    <MessageActions>
                      <CopyButton message={message} />
                    </MessageActions>
                  </MessageToolbar>
                )}
              </Message>
            ))}

            {/* Thinking indicator while the model is preparing a response */}
            {status === "submitted" && (
              <Message from="assistant">
                <div className="flex items-center gap-2 mb-1 select-none">
                  <AgentOrb size="sm" state="thinking" />
                  <span className="text-xs font-semibold text-brand-ink">
                    Muvx Copilot
                  </span>
                  <span className="text-[10px] text-brand-muted-soft font-mono uppercase tracking-wider">
                    Orchestrating Sub-agents
                  </span>
                </div>
                <MessageContent>
                  <Shimmer duration={2}>Planning and coordinating sub-agents…</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Input container: clean, floating, NO border-t */}
      <div className="shrink-0 p-4 max-w-3xl mx-auto w-full">
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
