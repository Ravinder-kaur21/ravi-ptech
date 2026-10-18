import { NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import { parseRateConfirmationFile } from "@/lib/rate-conf-parser"

export const maxDuration = 60 // Allow Gemini document analysis up to 60s

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const mimeType = file.type || "application/pdf"
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await parseRateConfirmationFile({
      buffer,
      mimeType,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, rateLimited: result.rateLimited },
        { status: result.rateLimited ? 429 : 422 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (err: any) {
    console.error("[API:PARSE_RATE_CON] Error:", err)
    return NextResponse.json(
      { error: "Internal server error parsing document." },
      { status: 500 }
    )
  }
}
