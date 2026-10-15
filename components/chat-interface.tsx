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
import { MessageSquare } from "lucide-react";

/** NIM is currently the only configured provider. */
const PROVIDER = "nim";

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

export default function ChatInterface() {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    id: "ai-chat",
  });

  // Fetch available models from the NIM API on mount
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: { models: { id: string }[] }) => {
        const ids = data.models.map((m) => m.id);
        setAvailableModels(ids);
        if (ids.length > 0) {
          setSelectedModel(ids[0]);
        }
      })
      .catch(() => {
        /* models will be empty — UI shows placeholder */
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
          provider: PROVIDER,
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
            provider: PROVIDER,
            model: selectedModel,
          },
        }
      );
    });
  };

  const handleSuggestionClick = (text: string) => {
    sendWithProvider(text, { webSearch: false, model: selectedModel });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Message list with auto-scroll */}
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-12" />}
              title="Start a conversation"
              description="Choose a model, then ask a question."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) =>
                    renderPart(message, part, i)
                  )}
                </MessageContent>
              </Message>
            ))
          )}

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

      {/* Suggestions + input */}
      <div className="border-t bg-muted/10 p-4">
        {messages.length > 0 && status !== "streaming" && (
          <div className="mb-3">
            <Suggestions>
              <Suggestion
                suggestion="What are the key features of the AI SDK?"
                onClick={() =>
                  handleSuggestionClick(
                    "What are the key features of the AI SDK?"
                  )
                }
              />
              <Suggestion
                suggestion="Calculate 2 + 2 * 3"
                onClick={() =>
                  handleSuggestionClick("Calculate 2 + 2 * 3")
                }
              />
            </Suggestions>
          </div>
        )}

        <AI_Input_Search
          models={availableModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onSubmit={sendWithProvider}
          onFilesSelected={handleFiles}
          placeholder="Ask me anything..."
          searchLabel="Web Search"
        />
      </div>
    </div>
  );
}
