"use client";

/**
 * Renders downloadable documents from `generateDocument` / `exportLoadsCsv`
 * using the official AI Elements `<Artifact>` primitive. Per
 * elements.ai-sdk.dev/components/artifact, an `Artifact` is the canonical
 * surface for produced artefacts with a header, description, primary action,
 * and an inline preview body.
 */
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  Code2Icon,
  FileTypeIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FORMAT_ICON: Record<string, LucideIcon> = {
  pdf: FileTextIcon,
  csv: FileSpreadsheetIcon,
  md: Code2Icon,
  html: Code2Icon,
  txt: FileTypeIcon,
  png: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
};

const FORMAT_LABEL: Record<string, string> = {
  pdf: "PDF",
  csv: "CSV",
  md: "Markdown",
  html: "HTML",
  txt: "Text",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
};

function fmtBytes(n?: number) {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocumentArtifact({
  output,
  toolName,
}: {
  output: any
  toolName: string
}) {
  const downloadUrl: string | undefined = output?.downloadUrl
  const publicUrl: string | undefined = output?.publicUrl
  const filename: string | undefined = output?.filename
  const format: string | undefined = (output?.format || "").toLowerCase()
  const sizeBytes: number | undefined = output?.sizeBytes
  const count: number | undefined = output?.count
  if (!downloadUrl && !publicUrl) return null

  const Icon = (format && FORMAT_ICON[format]) || (toolName === "exportLoadsCsv" ? FileSpreadsheetIcon : FileTextIcon)
  const formatLabel = (format && FORMAT_LABEL[format]) || (toolName === "exportLoadsCsv" ? "CSV" : "Document")
  const rowsDesc =
    typeof count === "number" && count > 0
      ? `${count.toLocaleString()} rows · ${filename ?? ""}`
      : (filename ?? "")

  return (
    <Artifact className="my-2 w-full max-w-md">
      <ArtifactHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-brand-cream/60 p-2">
            <Icon className="size-4 text-brand-ink" aria-hidden />
          </div>
          <div className="space-y-0.5">
            <ArtifactTitle>
              {toolName === "exportLoadsCsv" ? "Load export" : "Generated document"}
            </ArtifactTitle>
            <ArtifactDescription>
              {formatLabel} · {fmtBytes(sizeBytes) || rowsDesc || "ready"}
            </ArtifactDescription>
          </div>
        </div>
        <ArtifactActions>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename || true}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Download ${filename ?? "document"}`}
            >
              <DownloadIcon className="size-4" />
            </a>
          )}
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Open public URL"
            >
              <ExternalLinkIcon className="size-4" />
            </a>
          )}
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="px-4 py-3">
        <div className="text-[11px] text-muted-foreground font-mono break-all">
          {filename || "untitled"}
          {publicUrl ? ` · ${publicUrl}` : ""}
        </div>
      </ArtifactContent>
    </Artifact>
  )
}
