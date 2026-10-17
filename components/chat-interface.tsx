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
import { cn } from "@/lib/utils";
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
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtContent,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation";
import {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
} from "@/components/ai-elements/task";
import {
  Question,
  QuestionPrompt,
  QuestionDescription,
  QuestionOptions,
  QuestionOption,
  QuestionActions,
  QuestionSubmit,
} from "@/components/ai-elements/question";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  Checkpoint,
  CheckpointIcon,
} from "@/components/ai-elements/checkpoint";
import type { AIModelItem } from "@/components/ai/model-picker";
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
  CheckIcon,
  XIcon,
  Truck,
  ArrowRight,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Users,
  Route,
  HelpCircle,
} from "lucide-react";
import { MuvxBot, type BotMood } from "@/components/ai/muvx-bot";

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
  index: number,
  addToolApprovalResponse?: (options: { id: string; approved: boolean; reason?: string }) => void,
  onSendMessage?: (text: string) => void
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
        className="my-1.5"
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
    const approval = (dynamic as any).approval as
      | { id: string; approved?: boolean; reason?: string; requestReason?: string }
      | undefined;
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

    // 2. Draft Load — with Confirmation approval workflow & Checkpoint milestone
    if (toolName === "draftLoad") {
      const load = output ?? input;
      const isApproved =
        toolPart.state === "output-available" || approval?.approved === true;
      const isRejected =
        toolPart.state === "output-denied" || approval?.approved === false;

      return (
        <div key={key} className="my-2 space-y-2">
          {/* Milestone Checkpoint when load is finalized */}
          {isApproved && (
            <Checkpoint className="my-2">
              <CheckpointIcon className="text-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Load Confirmed & Synced ({load?.draftId})
              </span>
            </Checkpoint>
          )}

          {/* Load Card */}
          <div className="rounded-xl border border-brand-accent/25 bg-gradient-to-br from-brand-accent/5 to-transparent p-3.5 text-xs space-y-2.5 max-w-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-brand-accent" />
                <span className="font-semibold text-brand-ink">
                  Load Draft {load?.draftId ?? ""}
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  isApproved
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : isRejected
                      ? "bg-rose-500/15 text-rose-600"
                      : "bg-amber-500/15 text-amber-600"
                )}
              >
                {isApproved
                  ? "Approved & Synced"
                  : isRejected
                    ? "Rejected"
                    : "Requires Dispatch Approval"}
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

          {/* Official Confirmation component for approval workflow */}
          {approval && (
            <Confirmation approval={approval} state={toolPart.state}>
              <ConfirmationRequest>
                <ConfirmationTitle>
                  {approval.requestReason ||
                    "This tool wants to create a new load. Do you approve?"}
                </ConfirmationTitle>
              </ConfirmationRequest>
              <ConfirmationAccepted>
                <CheckIcon className="size-4 text-emerald-600" />
                <span>Load creation approved</span>
              </ConfirmationAccepted>
              <ConfirmationRejected>
                <XIcon className="size-4 text-destructive" />
                <span>Load creation rejected</span>
              </ConfirmationRejected>
              <ConfirmationActions>
                <ConfirmationAction
                  variant="outline"
                  onClick={() =>
                    addToolApprovalResponse?.({
                      id: approval.id,
                      approved: false,
                    })
                  }
                >
                  Reject
                </ConfirmationAction>
                <ConfirmationAction
                  variant="default"
                  onClick={() =>
                    addToolApprovalResponse?.({
                      id: approval.id,
                      approved: true,
                    })
                  }
                >
                  Approve & Create
                </ConfirmationAction>
              </ConfirmationActions>
            </Confirmation>
          )}
        </div>
      );
    }

    // 3. Delegate Subtask — rendered with Task + Sub-Agent Child Bot
    if (toolName === "delegateSubtask") {
      const rawRole = (input?.agentRole || "Specialist").toLowerCase();
      const subtaskTitle = input?.subtaskTitle || "Task Execution";
      const findings = output?.findings;
      const objective = input?.objective;

      const childRole = rawRole.includes("rate") || rawRole.includes("audit")
        ? "rate_auditor"
        : rawRole.includes("driver") || rawRole.includes("fleet") || rawRole.includes("hos")
          ? "fleet_guardian"
          : rawRole.includes("route") || rawRole.includes("corridor")
            ? "route_planner"
            : rawRole.includes("safety") || rawRole.includes("fmcsa")
              ? "safety_compliance"
              : "dispatcher";

      return (
        <Task key={key} defaultOpen={isRunning}>
          <TaskTrigger title={`Sub-agent: ${input?.agentRole || "Specialist"} — ${subtaskTitle}`}>
            <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
              <MuvxBot
                variant="child"
                role={childRole}
                size="xs"
                mood={isRunning ? "think" : "happy"}
              />
              <p className="flex-1 text-left font-medium text-xs text-brand-ink">
                {input?.agentRole || "Specialist"}: {subtaskTitle}
              </p>
            </div>
          </TaskTrigger>
          <TaskContent>
            {isRunning && (
              <TaskItem>
                <div className="flex items-center gap-2 py-0.5">
                  <MuvxBot
                    variant="child"
                    role={childRole}
                    size="xs"
                    mood="think"
                  />
                  <Shimmer duration={2}>Sub-agent analyzing operational parameters…</Shimmer>
                </div>
              </TaskItem>
            )}
            {findings && (
              <TaskItem>
                <div className="flex items-start gap-2.5">
                  <MuvxBot
                    variant="child"
                    role={childRole}
                    size="sm"
                    mood="happy"
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <ChainOfThought defaultOpen className="p-0 border-0 space-y-2">
                      <ChainOfThoughtStep
                        status="complete"
                        icon={CheckCircle2}
                        label={subtaskTitle}
                        description={objective || "Sub-agent verification and analysis complete"}
                      >
                        {findings.verdict && (
                          <div className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {findings.verdict}
                          </div>
                        )}
                        <ChainOfThoughtSearchResults className="mt-2">
                          {Object.entries(findings)
                            .filter(([k]) => k !== "availableDrivers" && k !== "verdict")
                            .map(([k, v]) => (
                              <ChainOfThoughtSearchResult key={k}>
                                <span className="font-medium text-brand-ink capitalize">
                                  {k.replace(/([A-Z])/g, " $1")}:
                                </span>{" "}
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </ChainOfThoughtSearchResult>
                            ))}
                        </ChainOfThoughtSearchResults>
                        {findings.recommendation && (
                          <p className="mt-2 text-xs text-brand-muted-soft italic">
                            {findings.recommendation}
                          </p>
                        )}
                      </ChainOfThoughtStep>
                    </ChainOfThought>
                  </div>
                </div>
              </TaskItem>
            )}
            {output?.result && (
              <TaskItem>{output.result}</TaskItem>
            )}
          </TaskContent>
        </Task>
      );
    }

    // 4. Interactive Questions to Dispatcher via <Question> AI Element
    if (toolName === "askDispatcher") {
      const data = output ?? input;
      const prompt = data?.prompt || "Select an option:";
      const description = data?.description;
      const options = (data?.options || []) as { label: string; value: string }[];
      const selectionMode = (data?.selectionMode || "single") as "single" | "multiple";

      return (
        <div key={key} className="my-3 max-w-xl">
          <Question
            selectionMode={selectionMode}
            onSubmit={(response) => {
              const selectedValues = response.selectedValues;
              const selectedLabels = options
                .filter((o) => selectedValues.includes(o.value))
                .map((o) => o.label);
              const answerText =
                selectedLabels.length > 0
                  ? selectedLabels.join(", ")
                  : selectedValues.join(", ");
              const extra = response.text ? ` (${response.text})` : "";
              onSendMessage?.(`I choose: ${answerText}${extra}`);
            }}
            className="rounded-xl border border-brand-accent/25 bg-brand-card/90 shadow-2xs space-y-3 p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-brand-accent" />
                <QuestionPrompt className="font-medium text-xs text-brand-ink">
                  {prompt}
                </QuestionPrompt>
              </div>
              {description && (
                <QuestionDescription className="text-xs text-brand-muted-soft pl-6">
                  {description}
                </QuestionDescription>
              )}
            </div>
            <QuestionOptions className="pt-1">
              {options.map((opt) => (
                <QuestionOption
                  key={opt.value}
                  value={opt.value}
                  className="text-xs border-brand-rule hover:border-brand-accent/50"
                >
                  {opt.label}
                </QuestionOption>
              ))}
            </QuestionOptions>
            <QuestionActions className="pt-2">
              <QuestionSubmit className="h-8 px-3 text-xs bg-brand-accent hover:bg-brand-accent/90 text-white">
                Submit Response
              </QuestionSubmit>
            </QuestionActions>
          </Question>
        </div>
      );
    }

    // 5. Regulatory & Market Documentation via <Sources> AI Element
    if (toolName === "searchFreightKnowledge") {
      const data = output ?? input;
      const summary = data?.summary;
      const sources = (data?.sources || []) as { title: string; href: string }[];

      return (
        <div key={key} className="my-2 max-w-xl space-y-2">
          {summary && (
            <div className="rounded-xl border border-brand-rule/80 bg-brand-card/70 p-3 text-xs text-brand-ink leading-relaxed">
              <p className="font-semibold text-brand-accent mb-1 text-[11px] uppercase tracking-wide">
                Regulatory & Market Intelligence
              </p>
              <p>{summary}</p>
            </div>
          )}
          {sources.length > 0 && (
            <Sources className="mt-2 text-xs">
              <SourcesTrigger count={sources.length} />
              <SourcesContent>
                {sources.map((s, idx) => (
                  <Source
                    key={idx}
                    href={s.href}
                    title={s.title}
                    className="text-xs text-brand-accent hover:underline flex items-center gap-1.5"
                  />
                ))}
              </SourcesContent>
            </Sources>
          )}
        </div>
      );
    }

    // 6. All other tool calls rendered via ToolCallsSection
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
        toolName === "checkFleetAvailability"
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

export default function ChatInterface() {
  const [provider, setProvider] = useState<string>(DEFAULT_PROVIDER);
  const [availableModels, setAvailableModels] = useState<AIModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [interactiveMood, setInteractiveMood] = useState<BotMood>("idle");

  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat({
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

        <div className="w-full max-w-2xl text-center mb-6 space-y-2">
          {/* Muvx Copilot Master Bot with Pointer Tracking and Mood Expressions */}
          <MuvxBot
            size="lg"
            coat="ink"
            mood={
              status === "submitted"
                ? "think"
                : status === "streaming"
                  ? "listen"
                  : interactiveMood
            }
            showDots={status === "submitted" || interactiveMood === "think"}
            className="mb-1 mx-auto"
          />

          {/* Interactive Mood Selector - allows immediate live mood testing */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {(["idle", "listen", "think", "happy", "wow", "sleep"] as BotMood[]).map(
              (m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInteractiveMood(m)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all capitalize",
                    interactiveMood === m && status !== "submitted" && status !== "streaming"
                      ? "bg-brand-ink text-brand-cream shadow-2xs"
                      : "bg-brand-card/80 border border-brand-rule text-brand-muted-soft hover:text-brand-ink hover:border-brand-accent/40"
                  )}
                >
                  {m}
                </button>
              )
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-brand-ink pt-1">
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

        {/* Suggestion Chips using official Suggestion component */}
        <div className="mt-4 max-w-2xl px-2">
          <Suggestions className="justify-center">
            <Suggestion
              suggestion="Draft load from rate confirmation"
              onClick={handleSuggestionClick}
              className="border-brand-rule bg-brand-card text-brand-muted-soft hover:border-brand-accent/40 hover:text-brand-ink hover:bg-brand-cream/50 shadow-2xs"
            />
            <Suggestion
              suggestion="FMCSA HOS 34-hour restart rules"
              onClick={handleSuggestionClick}
              className="border-brand-rule bg-brand-card text-brand-muted-soft hover:border-brand-accent/40 hover:text-brand-ink hover:bg-brand-cream/50 shadow-2xs"
            />
            <Suggestion
              suggestion="Calculate break-even cost per mile"
              onClick={handleSuggestionClick}
              className="border-brand-rule bg-brand-card text-brand-muted-soft hover:border-brand-accent/40 hover:text-brand-ink hover:bg-brand-cream/50 shadow-2xs"
            />
            <Suggestion
              suggestion="Find available trucks in Midwest"
              onClick={handleSuggestionClick}
              className="border-brand-rule bg-brand-card text-brand-muted-soft hover:border-brand-accent/40 hover:text-brand-ink hover:bg-brand-cream/50 shadow-2xs"
            />
          </Suggestions>
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
          <ConversationContent className="max-w-4xl mx-auto w-full px-4 py-4 gap-4">
            {messages.map((message, mIdx) => {
              const isLastMessage = mIdx === messages.length - 1;
              const isAssistant = message.role === "assistant";
              return (
                <Message key={message.id} from={message.role} className="gap-1.5">
                  {isAssistant && (
                    <div className="flex items-center gap-2 mb-0.5 select-none">
                      <MuvxBot
                        size="xs"
                        coat="ink"
                        mood={
                          isLastMessage && status === "streaming"
                            ? "listen"
                            : isLastMessage && status === "submitted"
                              ? "think"
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
                      renderPart(
                        message,
                        part,
                        i,
                        addToolApprovalResponse,
                        (text) => sendWithProvider(text, { webSearch: false, model: selectedModel })
                      )
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
                  <MuvxBot size="xs" coat="ink" mood="think" />
                  <span className="text-xs font-medium text-brand-ink/90">
                    Muvx
                  </span>
                </div>
                <MessageContent>
                  <Shimmer duration={2}>Thinking…</Shimmer>
                </MessageContent>
              </Message>
            )}

            {/* Contextual Suggestion Chips when assistant is idle */}
            {status === "ready" && messages.length > 0 && (
              <div className="py-2">
                <Suggestions className="justify-start">
                  <Suggestion
                    suggestion="Audit rate confirmation"
                    onClick={handleSuggestionClick}
                    className="text-xs border-brand-rule bg-brand-card/70 text-brand-muted-soft hover:text-brand-ink shadow-2xs"
                  />
                  <Suggestion
                    suggestion="Check driver HOS availability"
                    onClick={handleSuggestionClick}
                    className="text-xs border-brand-rule bg-brand-card/70 text-brand-muted-soft hover:text-brand-ink shadow-2xs"
                  />
                  <Suggestion
                    suggestion="FMCSA 34-hour restart rules"
                    onClick={handleSuggestionClick}
                    className="text-xs border-brand-rule bg-brand-card/70 text-brand-muted-soft hover:text-brand-ink shadow-2xs"
                  />
                  <Suggestion
                    suggestion="Draft load for dispatch"
                    onClick={handleSuggestionClick}
                    className="text-xs border-brand-rule bg-brand-card/70 text-brand-muted-soft hover:text-brand-ink shadow-2xs"
                  />
                </Suggestions>
              </div>
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
