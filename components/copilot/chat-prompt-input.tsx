"use client";

/**
 * ChatPromptInput — the official `<PromptInput>` AI Element wired with the
 * Muvx S3-presigned upload pipeline.
 *
 * The AI Elements `<PromptInput>` (`elements.ai-sdk.dev/components/prompt-input`)
 * is the canonical input surface for an agent and owns the attachment
 * lifecycle via `usePromptInputAttachments` — drop / click / paste all
 * surface a list above the textarea through `<PromptInputHeader>`. The
 * submit handler receives `{ text, files: FileUIPart[] }` with data URLs
 * for `image/*` / `text/*` only; for PDFs / Office docs / audio we route
 * through `/api/copilot/attachments` to push to S3 and produce a real URL.
 *
 * Status-aware submit + auto-resize textarea + model select + slash menu all
 * are official sub-components.
 */
import { useState } from "react"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputTabsList,
  PromptInputTab,
  PromptInputTabLabel,
  PromptInputTabBody,
  PromptInputTabItem,
} from "@/components/ai-elements/prompt-input"
import type { ChatStatus } from "ai"
import { GlobeIcon, PaperclipIcon, SquareIcon } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface ModelOption {
  id: string
  label?: string
}

interface Props {
  status: ChatStatus
  availableModels: ModelOption[]
  selectedModel: string
  onModelChange: (model: string) => void
  onSubmit: (text: string, options: { files: any[]; model: string; webSearch: boolean }) => Promise<void> | void
  onStop?: () => void
  globalDrop?: boolean
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  return res.blob()
}

async function uploadViaS3(file: {
  url: string
  mediaType: string
  filename: string
}): Promise<string> {
  if (!file.url.startsWith("data:")) return file.url
  const blob = await dataUrlToBlob(file.url)
  const presign = await fetch("/api/copilot/attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.filename,
      contentType: file.mediaType,
      kind: "attachments",
    }),
  })
  if (!presign.ok) {
    throw new Error(`Presign failed: ${presign.status}`)
  }
  const { uploadUrl, publicUrl } = (await presign.json()) as {
    uploadUrl: string
    publicUrl: string
  }
  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": file.mediaType },
  })
  if (!put.ok) {
    throw new Error(`Upload failed: ${put.status}`)
  }
  return publicUrl
}

export function ChatPromptInput({
  status,
  availableModels,
  selectedModel,
  onModelChange,
  onSubmit,
  onStop,
  globalDrop = true,
}: Props) {
  const [webSearch, setWebSearch] = useState(false)

  return (
    <PromptInput
      accept="*"
      multiple
      globalDrop={globalDrop}
      maxFiles={20}
      maxFileSize={50 * 1024 * 1024}
      syncHiddenInput
      onSubmit={async (message: PromptInputMessage) => {
        try {
          const uploaded = await Promise.all(
            (message.files ?? []).map((f) =>
              uploadViaS3({
                url: f.url as string,
                mediaType: (f as any).mediaType,
                filename: (f as any).filename ?? "upload",
              }),
            ),
          )
          const files = (message.files ?? []).map((f, i) => ({
            type: "file" as const,
            mediaType: (f as any).mediaType,
            filename: (f as any).filename,
            url: uploaded[i],
          }))
          await onSubmit(message.text, { files, model: selectedModel, webSearch })
        } catch (e: any) {
          toast.error(`Upload failed: ${e?.message ?? String(e)}`)
        }
      }}
      onError={(err) => toast.error(err.message)}
    >
      <PromptInputHeader />
      <PromptInputBody>
        <PromptInputTextarea placeholder="Ask Muvx Copilot, draft a load, schedule a driver task, or paste a rate con…" />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTabsList>
          <PromptInputTab>
            <PromptInputTabLabel>
              <GlobeIcon className="size-3.5 text-muted-foreground" />
              Web
            </PromptInputTabLabel>
            <PromptInputTabBody>
              <PromptInputTabItem>
                <label className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2 text-xs">
                  <span className="flex-1">
                    <div className="font-medium text-foreground">Web-grounded answer</div>
                    <div className="text-muted-foreground">
                      Route through the model's web-grounded provider when supported.
                    </div>
                  </span>
                  <Switch checked={webSearch} onCheckedChange={(v) => setWebSearch(Boolean(v))} />
                </label>
              </PromptInputTabItem>
            </PromptInputTabBody>
          </PromptInputTab>
          <PromptInputTab>
            <PromptInputTabLabel>
              <PaperclipIcon className="size-3.5 text-muted-foreground" />
              Attach
            </PromptInputTabLabel>
            <PromptInputTabBody>
              <PromptInputActionMenu>
                <PromptInputActionAddAttachments label="Upload document" />
              </PromptInputActionMenu>
            </PromptInputTabBody>
          </PromptInputTab>
        </PromptInputTabsList>

        <PromptInputTools>
          <PromptInputSelect value={selectedModel} onValueChange={onModelChange}>
            <PromptInputSelectTrigger>
              <PromptInputSelectValue placeholder="Pick a model" />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {availableModels.map((m) => (
                <PromptInputSelectItem key={m.id} value={m.id}>
                  {m.label ?? m.id}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
        </PromptInputTools>

        <PromptInputSubmit
          status={status}
          onStop={onStop}
          className="ml-auto"
        >
          {status === "streaming" || status === "submitted" ? (
            <SquareIcon className="size-3.5" />
          ) : (
            <PaperclipIcon className="size-3.5" />
          )}
        </PromptInputSubmit>
      </PromptInputFooter>
    </PromptInput>
  )
}
