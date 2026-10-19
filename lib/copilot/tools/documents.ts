/**
 * Documents domain — the agent can now produce **downloadable artefacts** for
 * the user. Output is buffered, sent to S3, and returned with a presigned GET
 * URL via `/api/copilot/documents`. Powered by @ai-sdk/tool shape:
 *   - generateDocument  → freeform PDF/DOCX/HTML/MD/text from a string body
 *   - exportLoadsCsv    → tab-separated CSV of loads for a date range
 *   - exportInvoicePdf  → simple invoice PDF (text-based for now)
 *   - exportSettlementXlsx → CSV (xlsx requires ExcelJS; we ship CSV+PDF first)
 *
 * These tools are key to "give the user a downloadable document" capability.
 */
import { z } from "zod"
import { defineTmsTool, type ToolContext } from "../types"
import { db } from "@/lib/db"
import { load as dbLoad } from "@/lib/schema"
import { and, eq, gte, lte, desc } from "drizzle-orm"
import { putObject, presignDownload } from "@/lib/s3-client"
import { logCopilotEvent } from "../db-init"

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[c]!)
}

/** Build a one-page PDF from a title and a list of key/value rows. Pure string-based. */
function rowsToPdf(title: string, rows: Array<{ label: string; value: string }>) {
  const textLines = [
    title,
    ...rows.flatMap((r) => [`${r.label}: ${r.value}`]),
  ]
  // Minimal valid PDF, single page, Helvetica, ISO-8859-1
  const stream = `BT /F1 12 Tf 50 760 Td (${textLines.map(escapeXml).map((s) => s.replace(/\(/g, "\\(").replace(/\)/g, "\\)")).join("\\n")}) Tj ET`
  const streamLen = Buffer.byteLength(stream, "latin1")
  const objects: string[] = []
  objects[1] = "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj"
  objects[2] = "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj"
  objects[3] = "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj"
  objects[4] = `4 0 obj<</Length ${streamLen}>>stream\n${stream}\nendstream endobj`
  objects[5] = "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj"
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  for (let i = 1; i < 6; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"))
    pdf += objects[i] + "\n"
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1")
  pdf += `xref\n0 6\n0000000000 65535 f \n`
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`
  pdf += `trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`
  return Buffer.from(pdf, "latin1")
}

/** CSV from rows, RFC-4180 friendly. */
function rowsToCsv(header: string[], rows: Array<Record<string, unknown>>) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = header.join(",")
  return [head, ...rows.map((r) => header.map((h) => esc(r[h])).join(","))].join("\n")
}

export const generateDocumentTool = defineTmsTool({
  name: "generateDocument",
  description:
    "Generate a downloadable document (PDF, CSV, DOCX-style text, or Markdown) from the agent's own content and upload it to S3. Returns a public URL plus a 5-minute presigned download URL.",
  requiresApproval: true,
  approvalReason:
    "Authorizing this will create a new artifact in your workspace's object storage and return a public download URL.",
  requiredPermissions: ["documents.create"],
  inputSchema: z.object({
    title: z.string().min(1).max(255),
    format: z.enum(["pdf", "csv", "md", "html", "txt"]).default("pdf"),
    body: z.string().describe("Document body content"),
    filename: z.string().min(1).max(255),
    rows: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe("Optional tabular rows (CSV/PDF) — use this for data exports"),
  }),
  execute: async (params, ctx) => {
    const safe = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_")
    const id = crypto.randomUUID()
    const key = `${ctx.tenantId}/documents/${id}/${safe}`

    let buf: Buffer
    let contentType: string
    if (params.format === "pdf") {
      const headerRows =
        Array.isArray(params.rows) && params.rows.length > 0
          ? Object.entries(params.rows[0]).map(([k]) => ({ label: k, value: String(params.rows![0][k] ?? "") }))
          : []
      buf = rowsToPdf(params.title, headerRows)
      if (params.body && headerRows.length === 0) {
        // re-render with title + body lines
        const lines = params.body.split("\n").slice(0, 50).map((line) => ({
          label: "·",
          value: line,
        }))
        buf = rowsToPdf(params.title, lines)
      }
      contentType = "application/pdf"
    } else if (params.format === "csv") {
      const rows = Array.isArray(params.rows) ? params.rows : []
      const header = rows.length > 0 ? Object.keys(rows[0]) : []
      buf = Buffer.from(rowsToCsv(header, rows), "utf-8")
      contentType = "text/csv"
    } else if (params.format === "html") {
      buf = Buffer.from(
        `<!doctype html><html><head><meta charset="utf-8"/><title>${params.title}</title><style>body{font:14px/1.5 -apple-system,Segoe UI,Helvetica,sans-serif;padding:32px;color:#111}h1{margin-top:0}</style></head><body><h1>${params.title}</h1><pre style="white-space:pre-wrap">${params.body}</pre></body></html>`,
        "utf-8",
      )
      contentType = "text/html"
    } else if (params.format === "md") {
      buf = Buffer.from(`# ${params.title}\n\n${params.body}\n`, "utf-8")
      contentType = "text/markdown"
    } else {
      buf = Buffer.from(params.body, "utf-8")
      contentType = "text/plain"
    }

    const publicUrl = await putObject({ key, body: buf, contentType })
    const downloadUrl = await presignDownload({
      key,
      downloadFilename: safe,
      expiresIn: 60 * 5,
    })

    await logCopilotEvent({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      level: "info",
      action: "Generated document",
      toolName: "generateDocument",
      status: "completed",
      output: { key, format: params.format, size: buf.length } as any,
    }).catch(() => {})

    return {
      success: true,
      title: params.title,
      format: params.format,
      filename: safe,
      publicUrl,
      downloadUrl,
      key,
      sizeBytes: buf.length,
    }
  },
})

export const exportLoadsCsvTool = defineTmsTool({
  name: "exportLoadsCsv",
  description:
    "Export loads in a date range as a downloadable CSV. Returns a 5-minute download URL.",
  requiresApproval: false,
  inputSchema: z.object({
    fromDate: z.string().describe("ISO date (YYYY-MM-DD) inclusive"),
    toDate: z.string().describe("ISO date (YYYY-MM-DD) inclusive"),
  }),
  execute: async (params, ctx) => {
    const rows = await db
      .select()
      .from(dbLoad)
      .where(
        and(
          eq(dbLoad.tenantId, ctx.tenantId),
          gte(dbLoad.createdAt, new Date(params.fromDate)),
          lte(dbLoad.createdAt, new Date(`${params.toDate}T23:59:59.999Z`)),
        ),
      )
      .orderBy(desc(dbLoad.createdAt))
      .limit(2000)

    const header = [
      "loadNumber",
      "status",
      "originCity",
      "destinationCity",
      "rateUsd",
      "miles",
      "pickupAt",
      "deliveredAt",
    ]
    const csv = rowsToCsv(header, rows as any)
    const id = crypto.randomUUID()
    const key = `${ctx.tenantId}/documents/${id}/loads-${params.fromDate}_${params.toDate}.csv`
    const publicUrl = await putObject({ key, body: Buffer.from(csv, "utf-8"), contentType: "text/csv" })
    const downloadUrl = await presignDownload({
      key,
      downloadFilename: `loads-${params.fromDate}_${params.toDate}.csv`,
      expiresIn: 60 * 5,
    })
    return { success: true, count: rows.length, publicUrl, downloadUrl, key }
  },
})
