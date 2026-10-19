import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"
import { DEFAULT_NIM_MODEL, getModel } from "@/lib/ai-providers"
import { getApExpensesForOrg, getCarrierPaymentsForOrg, getInvoicesForOrg, getLoadsForOrg, getSession, getTripsForOrg } from "@/lib/dal"

const MAX_USER_TEXT_LENGTH = 4000
const DEFAULT_MODEL = DEFAULT_NIM_MODEL

function buildWorkspaceContextSummary({
  loads,
  trips,
  invoices,
  apExpenses,
  carrierPayments,
}: {
  loads: any[]
  trips: any[]
  invoices: any[]
  apExpenses: any[]
  carrierPayments: any[]
}) {
  const totalLoadCount = loads.length
  const activeLoads = loads.filter((load) => !["delivered", "completed", "cancelled"].includes(String(load.status || "").toLowerCase())).length
  const openInvoiceTotal = invoices
    .filter((invoice) => String(invoice.status || "").toLowerCase() !== "paid")
    .reduce((sum, invoice) => sum + (Number.parseFloat(String(invoice.amount ?? "0")) || 0), 0)
  const openApTotal = apExpenses
    .filter((expense) => String(expense.status || "").toLowerCase() !== "paid")
    .reduce((sum, expense) => sum + (Number.parseFloat(String(expense.amount ?? "0")) || 0), 0)
  const openCarrierTotal = carrierPayments
    .filter((payment) => String(payment.status || "").toLowerCase() !== "paid")
    .reduce((sum, payment) => sum + (Number.parseFloat(String(payment.amount ?? "0")) || 0), 0)

  return {
    stats: {
      totalLoads: totalLoadCount,
      activeLoads,
      totalTrips: trips.length,
      totalInvoices: invoices.length,
      openInvoiceTotal,
      openApTotal,
      openCarrierTotal,
    },
    recentLoads: loads.slice(0, 5).map((load) => ({
      loadNumber: load.loadNumber ?? "—",
      customerName: load.customerName ?? "—",
      status: load.status ?? "unknown",
      originCity: load.originCity ?? "—",
      destCity: load.destCity ?? "—",
      rate: load.rate ?? null,
    })),
    recentInvoices: invoices.slice(0, 5).map((invoiceRow) => ({
      invoiceNumber: invoiceRow.invoiceNumber ?? "—",
      customerName: invoiceRow.customerName ?? "—",
      status: invoiceRow.status ?? "unknown",
      amount: invoiceRow.amount ?? "0",
      dueDate: invoiceRow.dueDate ?? null,
    })),
    recentAp: apExpenses.slice(0, 5).map((expense) => ({
      vendor: expense.vendor ?? expense.type ?? "Vendor",
      type: expense.type ?? "General",
      status: expense.status ?? "pending",
      amount: expense.amount ?? "0",
    })),
    recentCarrierPayments: carrierPayments.slice(0, 5).map((payment) => ({
      paymentMethod: payment.paymentMethod ?? "ACH",
      status: payment.status ?? "pending",
      amount: payment.amount ?? "0",
    })),
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : []
    const provider = typeof body.provider === "string" ? body.provider : "nim"
    const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL

    if (!messages.length) {
      return Response.json({ error: "Please send a message before requesting an AI response." }, { status: 400 })
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")
    const lastText = latestUserMessage?.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text || "")
      .join(" ")
      .trim()

    if (!lastText) {
      return Response.json({ error: "The latest message does not contain any text to analyze." }, { status: 400 })
    }

    if (lastText.length > MAX_USER_TEXT_LENGTH) {
      return Response.json({ error: `Your message is too long. Please keep it under ${MAX_USER_TEXT_LENGTH} characters.` }, { status: 400 })
    }

    const session = await getSession()
    if (!session?.user) {
      return Response.json({ error: "Please sign in to use the Muvx AI assistant." }, { status: 401 })
    }

    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return Response.json({ error: "Select or create a workspace before using the AI assistant." }, { status: 409 })
    }

    const [loads, trips, invoices, apExpenses, carrierPayments] = await Promise.all([
      getLoadsForOrg(tenantId),
      getTripsForOrg(tenantId),
      getInvoicesForOrg(tenantId),
      getApExpensesForOrg(tenantId),
      getCarrierPaymentsForOrg(tenantId),
    ])

    const context = buildWorkspaceContextSummary({ loads, trips, invoices, apExpenses, carrierPayments })
    const result = streamText({
      model: getModel(provider, model),
      messages: await convertToModelMessages(messages),
      system: [
        "You are the Muvx AI assistant for a transportation management system.",
        "Answer using only the authorized workspace context provided below and do not invent records that are not in the data.",
        "When the user asks about loads, trips, invoices, carrier pay, or vehicle operations, use the supplied company data as the primary source.",
        "If the data is missing or insufficient, say what is missing clearly instead of guessing.",
        `Workspace context: ${JSON.stringify(context)}`,
      ].join("\n"),
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed. Please try again later."
    console.error("[AI] chat request failed:", error)
    return Response.json({ error: message }, { status: 500 })
  }
}
