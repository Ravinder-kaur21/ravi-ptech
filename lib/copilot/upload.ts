import type { FileUIPart } from "ai"

/** Response shape returned by POST /api/copilot/upload. */
interface PresignedUpload {
  key: string;
  url: string;
  uploadUrl: string;
  filename: string;
  mediaType: string;
  size: number;
}

/**
 * Uploads a single file to S3 via a presigned PUT and returns a FileUIPart
 * whose `url` is a presigned GET. Bytes go browser → S3 directly; our server
 * only signs, so large files never pass through the Next.js request body.
 */
async function uploadOne(file: File): Promise<FileUIPart> {
  const prepare = await fetch("/api/copilot/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mediaType: file.type || "application/octet-stream",
      size: file.size,
    }),
  });

  if (!prepare.ok) {
    const detail = await prepare.json().catch(() => null);
    throw new Error(detail?.error || `Upload failed (${prepare.status})`);
  }

  const presigned = (await prepare.json()) as PresignedUpload;

  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presigned.mediaType },
    body: file,
  });

  if (!put.ok) {
    throw new Error(`Could not store ${file.name} (${put.status})`);
  }

  return {
    type: "file",
    mediaType: presigned.mediaType,
    filename: presigned.filename,
    url: presigned.url,
    // Persisted alongside the message so history can be re-signed on read,
    // and so the UI can show a human-readable file size without re-uploading.
    key: presigned.key,
    size: presigned.size,
  } as FileUIPart & { key: string; size: number };
}

/** Uploads every file, surfacing the first failure to the caller. */
export async function uploadFilesToS3(files: File[]): Promise<FileUIPart[]> {
  return Promise.all(files.map(uploadOne));
}

/**
 * Swaps an expired attachment URL for a fresh presigned GET.
 *
 * Stored GET URLs expire after an hour, so persisted chat history needs
 * re-signing before download. Non-S3 URLs (data URLs, external links) are
 * returned untouched.
 */
export async function refreshAttachmentUrl(
  part: FileUIPart,
): Promise<FileUIPart> {
  const key = (part as FileUIPart & { key?: string }).key;
  if (!key) return part;

  const res = await fetch("/api/copilot/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, mediaType: part.mediaType }),
  });

  if (!res.ok) return part;
  const { url } = await res.json();
  return { ...part, url };
}