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
} from "@/components/ai-elements/message";
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
import { MessageSquare, Sparkles } from "lucide-react";
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

    // ToolUIPart (static) needs type+state but no toolName;
    // DynamicToolUIPart needs type+state+toolName.
    if (toolPart.type === "dynamic-tool") {
      const dynamic = part as unknown as DynamicToolUIPart;
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
                <MessageContent>
                  {message.parts.map((part, i) =>
                    renderPart(message, part, i)
                  )}
                </MessageContent>
              </Message>
            ))}

            {/* Thinking indicator while the model is preparing a response */}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer duration={2}>Thinking…</Shimmer>
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
