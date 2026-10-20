"use client";

/**
 * FilePart — ChatGPT-style attachment chip rendered inside the user bubble.
 *
 *   [📷 screenshot.png]
 *   [📄 resume.pdf        ]
 *
 * For images we render an inline thumbnail. For documents we render a labelled
 * card that links out to the file URL.
 */

import { File as FileIcon, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "../types";

export type ParsedAttachment = MessageAttachment;

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}

function pickIcon(mime: string) {
  if (isImageMime(mime)) return ImageIcon;
  if (isPdfMime(mime)) return FileText;
  return FileIcon;
}

function shortMime(mime: string): string {
  const known: Record<string, string> = {
    "application/pdf": "PDF",
    "text/plain": "TXT",
    "text/markdown": "MD",
    "text/csv": "CSV",
    "application/json": "JSON",
    "application/zip": "ZIP",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  };
  if (known[mime]) return known[mime];
  const slash = mime.indexOf("/");
  return slash < 0 ? mime.toUpperCase() : mime.slice(slash + 1).toUpperCase();
}

export function FilePart({ attachment }: { attachment: ParsedAttachment }) {
  const mime = attachment.mimeType || "";
  if (isImageMime(mime)) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group/attach relative block overflow-hidden rounded-xl border border-brand-rule/50 bg-brand-cream-soft transition-colors hover:border-brand-accent/40"
        title={attachment.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-64 max-w-72 object-contain"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5 text-[11px] font-medium text-white">
          {attachment.name}
        </div>
      </a>
    );
  }

  const Icon = pickIcon(mime);
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/attach inline-flex max-w-72 items-center gap-2 rounded-xl border border-brand-rule/60 bg-brand-card/80 px-2.5 py-2 text-xs text-brand-ink transition-colors hover:border-brand-accent/40 hover:bg-brand-cream-soft"
      title={attachment.name}
    >
      <Icon className="size-4 shrink-0 text-brand-muted-soft" />
      <span className="min-w-0 truncate font-medium">{attachment.name}</span>
      {mime && (
        <span className="ml-1 shrink-0 rounded-md bg-brand-cream px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-brand-muted-soft">
          {shortMime(mime)}
        </span>
      )}
    </a>
  );
}

export function FilePartList({
  attachments,
  className,
}: {
  attachments: ParsedAttachment[];
  className?: string;
}) {
  if (!attachments.length) return null;
  return (
    <div className={cn("mb-2 flex max-w-full flex-wrap justify-end gap-2", className)}>
      {attachments.map((attachment, index) => (
        <FilePart key={`${attachment.url}-${index}`} attachment={attachment} />
      ))}
    </div>
  );
}
