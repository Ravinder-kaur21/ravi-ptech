export type AuthErrorDetails = {
  message?: string
  status?: number
  statusText?: string
}

export function getAuthErrorDetails(error: unknown): AuthErrorDetails {
  if (typeof error !== "object" || error === null) return {}

  const details = error as Record<string, unknown>
  const responseError =
    typeof details.error === "object" && details.error !== null
      ? (details.error as Record<string, unknown>)
      : undefined
  const message =
    (typeof details.message === "string" && details.message) ||
    (typeof responseError?.message === "string" && responseError.message) ||
    (error instanceof Error ? error.message : undefined)

  return {
    message: message || undefined,
    status: typeof details.status === "number" ? details.status : undefined,
    statusText:
      typeof details.statusText === "string" ? details.statusText : undefined,
  }
}

export function getAuthErrorMessage(
  details: AuthErrorDetails,
  fallback: string,
): string {
  if (
    !details.message &&
    details.status !== undefined &&
    details.status >= 500
  ) {
    return `${fallback} The server returned HTTP ${details.status}; check the server logs and database connection.`
  }

  return details.message || details.statusText || fallback
}
