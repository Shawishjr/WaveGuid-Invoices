import { prisma } from "@/lib/prisma";
import { getInvoicePdfById } from "@/lib/invoice-pdf";

const API_BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v21.0"}`;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const TOKEN = process.env.WHATSAPP_TOKEN || "";
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE || "invoice_send";
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "en";

export function isWhatsappConfigured(): boolean {
  return Boolean(PHONE_NUMBER_ID && TOKEN);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

type GraphError = { error?: { message?: string } };

async function graphPost<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
  };
  let payload: BodyInit;
  if (body instanceof FormData) {
    payload = body;
  } else {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: payload,
  });

  const json = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok) {
    const message = json?.error?.message || `Graph API error (${res.status})`;
    throw new Error(message);
  }
  return json;
}

async function uploadMedia(pdf: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), filename);

  const json = await graphPost<{ id?: string }>(`/${PHONE_NUMBER_ID}/media`, form);
  if (!json.id) throw new Error("Media upload returned no id");
  return json.id;
}

export type WhatsappSendResult = {
  ok: boolean;
  error?: string;
};

/**
 * Sends the invoice PDF as a WhatsApp document message using an approved
 * template. The template must exist with:
 *   - header: document
 *   - body: 3 text variables (invoice number, total, due date)
 */
export async function sendInvoicePdf(
  invoiceId: string,
  phone: string
): Promise<WhatsappSendResult> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) return { ok: false, error: "Invoice not found" };

    const to = normalizePhone(phone);
    if (!to) return { ok: false, error: "Client has no valid phone number" };

    const pdfResult = await getInvoicePdfById(invoiceId);
    if (!pdfResult) return { ok: false, error: "Invoice not found" };

    const filename = `${pdfResult.number}.pdf`;
    const mediaId = await uploadMedia(pdfResult.pdf, filename);

    const totalStr = `${invoice.total.toFixed(2)} ${invoice.currency}`;
    const dueDateStr = invoice.dueDate.toISOString().slice(0, 10);

    await graphPost(`/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANG },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: invoice.number },
              { type: "text", text: totalStr },
              { type: "text", text: dueDateStr },
            ],
          },
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: { id: mediaId, filename },
              },
            ],
          },
        ],
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { whatsappSentAt: new Date() },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown WhatsApp error";
    console.error(`[whatsapp] invoice ${invoiceId}: ${message}`);
    return { ok: false, error: message };
  }
}
