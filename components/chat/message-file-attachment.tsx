"use client";

import { memo, useCallback, useState } from "react";
import type { FileUIPart } from "ai";
import { DownloadIcon, FileTextIcon, RefreshCwIcon, XIcon } from "lucide-react";

import {
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  AttachmentInfo,
  AttachmentPreview,
  getMediaCategory,
} from "@/components/ai-elements/attachments";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { refreshAttachmentUrl } from "@/lib/copilot/upload";
import { traceError, traceInfo } from "@/lib/copilot/client-trace";
import { cn } from "@/lib/utils";

/** A `FileUIPart` enriched by our upload route with S3 key and byte size. */
export type StoredFilePart = FileUIPart & {
  key?: string;
  size?: number;
};

/** 1536 B → "1.5 KB". Matches what the operator picked in the file picker. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** "application/pdf" → "PDF", "text/csv" → "CSV", "image/png" → "PNG". */
function formatMediaType(mediaType?: string): string | null {
  if (!mediaType) return null;
  const subtype = mediaType.split("/")[1]?.split("+")[0];
  if (!subtype) return null;
  const cleaned = subtype.replace(/^x-/, "").replace(/vnd\./, "");
  const known: Record<string, string> = {
    pdf: "PDF",
    csv: "CSV",
    json: "JSON",
    jsonl: "JSONL",
    plain: "TXT",
    markdown: "MD",
    doc: "DOC",
    wordprocessingml: "DOCX",
    excel: "XLS",
    spreadsheetml: "XLSX",
    octetstream: "FILE",
  };
  return known[cleaned.toLowerCase()] ?? cleaned.toUpperCase().slice(0, 5);
}

type Status = "ready" | "uploading" | "error";

export type MessageFileAttachmentProps = {
  /** Usually `${message.id}-${index}` so React keys stay stable across renders. */
  id: string;
  part: StoredFilePart;
  /** Defaults to `ready`. The input bar passes live upload state here. */
  status?: Status;
  error?: string | null;
  /** Rendered in place of the download button — used by the input bar to let a
      staged file be removed before it is sent. */
  onRemove?: () => void;
  className?: string;
};

/**
 * Compact attachment card for a chat message.
 *
 * Built on the AI Elements `Attachment` primitives (list variant) rather than a
 * bespoke markup tree, but tightened for message context: content-sized width,
 * a small icon tile, filename plus type and size, and a download affordance
 * that appears on hover. Deliberately no fixed width or height — a 96px
 * thumbnail square reads as an empty grey panel for non-image files.
 */
export const MessageFileAttachment = memo(function MessageFileAttachment({
  id,
  part,
  status = "ready",
  error = null,
  onRemove,
  className,
}: MessageFileAttachmentProps) {
  const [resigning, setResigning] = useState(false);
  const isImage = getMediaCategory({ ...part, id }) === "image";
  const typeLabel = formatMediaType(part.mediaType);
  const sizeLabel =
    typeof part.size === "number" && part.size > 0 ? formatBytes(part.size) : null;

  /**
   * Presigned GETs expire, so a long-lived chat may hold a dead URL. Re-sign on
   * demand rather than at render time — this only runs when the operator
   * actually clicks.
   */
  const handleDownload = useCallback(async () => {
    setResigning(true);
    try {
      const fresh = await refreshAttachmentUrl(part);
      traceInfo("attachment:download", { filename: part.filename });
      window.open(fresh.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      traceError("attachment:download-failed", {
        filename: part.filename,
        message: err instanceof Error ? err.message : String(err),
      });
      window.open(part.url, "_blank", "noopener,noreferrer");
    } finally {
      setResigning(false);
    }
  }, [part]);

  const isPending = status === "uploading";
  const hasError = status === "error";

  const meta = (
    <AttachmentInfo className="min-w-0 flex-1">
      <span className="block truncate text-xs font-medium text-brand-ink">
        {part.filename ?? "Attachment"}
      </span>
      {(typeLabel || sizeLabel) && (
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-brand-muted-soft">
          {typeLabel && (
            <span className="font-mono uppercase tracking-wide">{typeLabel}</span>
          )}
          {typeLabel && sizeLabel && (
            <span aria-hidden className="text-brand-rule">
              ·
            </span>
          )}
          {sizeLabel && <span>{sizeLabel}</span>}
        </span>
      )}
    </AttachmentInfo>
  );

  return (
    <AttachmentHoverCard>
      <AttachmentHoverCardTrigger delay={200}>
        <Attachment
          data={{ ...part, id }}
          onRemove={onRemove}
          className={cn(
            // `w-fit` keeps the card proportional to its content; `max-w-full`
            // stops a long filename from overflowing narrow viewports. The list
            // variant defaults to `w-full p-3`, which is what produced the
            // oversized panel.
            "w-fit max-w-full items-center gap-2.5 rounded-xl p-2",
            // Upload problems are reported on the status line, so the card keeps
            // the same neutral border either way.
            "border border-brand-rule bg-brand-card/70",
            "transition-colors hover:border-brand-accent/40 hover:bg-brand-cream/40",
            className
          )}
        >
          <AttachmentPreview
            fallbackIcon={
              <FileTextIcon className="size-4 text-brand-accent" />
            }
            className={cn(
              "size-8 rounded-lg border border-brand-rule-soft",
              "bg-brand-cream/60",
              isImage && "size-10"
            )}
          />

          {isPending ? (
            <Shimmer duration={1.4} className="min-w-0 flex-1 text-xs">
              Uploading…
            </Shimmer>
          ) : hasError ? (
            <p className="min-w-0 flex-1 text-xs leading-snug text-destructive">
              {error ?? "Upload failed"}
            </p>
          ) : (
            <>
              {meta}
              <Button
                aria-label={
                  onRemove
                    ? `Remove ${part.filename ?? "attachment"}`
                    : `Download ${part.filename ?? "attachment"}`
                }
                className="size-7 shrink-0 rounded-lg text-brand-muted-soft hover:text-brand-ink opacity-0 transition-opacity focus-visible:opacity-100 group-hover/attachment:opacity-100"
                disabled={resigning || isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onRemove) {
                    onRemove();
                    return;
                  }
                  void handleDownload();
                }}
                size="icon"
                title={onRemove ? "Remove" : "Open"}
                type="button"
                variant="ghost"
              >
                {resigning ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : onRemove ? (
                  <XIcon className="size-3.5" />
                ) : (
                  <DownloadIcon className="size-3.5" />
                )}
              </Button>
            </>
          )}
        </Attachment>
      </AttachmentHoverCardTrigger>
      <AttachmentHoverCardContent align="start">
        <p className="max-w-56 truncate font-mono text-[11px] text-muted-foreground">
          {part.filename ?? "attachment"}
        </p>
      </AttachmentHoverCardContent>
    </AttachmentHoverCard>
  );
});
