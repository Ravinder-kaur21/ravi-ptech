"use client";

/**
 * Drill-down for chat-thread attachments using the official AI Elements
 * `<FileTree>`. Renders file parts in a collapsible tree, grouped by
 * message id, so the user can scan what they sent to the agent across the
 * whole thread.
 */
import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
  FileTreeName,
  FileTreeIcon,
} from "@/components/ai-elements/file-tree"
import type { FileUIPart, UIMessage } from "ai"
import { isFileUIPart } from "ai"
import { FileIcon, PaperclipIcon } from "lucide-react"

export function AttachmentsTree({ messages }: { messages: UIMessage[] }) {
  const groups = messages
    .map((m) => ({
      id: m.id,
      role: m.role,
      files: (m.parts ?? []).filter(isFileUIPart) as FileUIPart[],
    }))
    .filter((g) => g.files.length > 0)

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <PaperclipIcon className="size-3.5" />
          No attachments in this thread yet. Drop a rate-con PDF, BOL image, or CSV to the chat to share it with the agent.
        </div>
      </div>
    )
  }

  return (
    <FileTree defaultExpanded={new Set([groups[0].id])}>
      {groups.map((g) => (
        <FileTreeFolder key={g.id} path={g.id} name={`${g.role} turn`}>
          {g.files.map((f, idx) => {
            const url = (f as any).url as string | undefined
            const filename = (f as any).filename ?? `attachment-${idx + 1}`
            return (
              <FileTreeFile
                key={`${g.id}-file-${idx}`}
                path={`${g.id}/${idx}`}
                name={filename}
                icon={<FileIcon className="size-3.5 text-muted-foreground" />}
              >
                <FileTreeIcon>
                  <FileIcon className="size-3.5" />
                </FileTreeIcon>
                <FileTreeName>
                  <a
                    href={url ?? "#"}
                    target={url ? "_blank" : undefined}
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {filename}
                  </a>
                  <span className="ml-2 text-[10px] text-muted-foreground font-mono">
                    {f.mediaType}
                  </span>
                </FileTreeName>
              </FileTreeFile>
            )
          })}
        </FileTreeFolder>
      ))}
    </FileTree>
  )
}
