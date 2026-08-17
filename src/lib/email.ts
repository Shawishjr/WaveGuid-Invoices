import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { getInvoicePdfById } from "@/lib/invoice-pdf";

const HOST = process.env.SMTP_HOST || "";
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || "";
const PASS = process.env.SMTP_PASS || "";
const SECURE = process.env.SMTP_SECURE === "true" || PORT === 465;
const FROM = process.env.EMAIL_FROM || USER;

export function isEmailConfigured(): boolean {
  return Boolean(HOST && USER && PASS);
}

export type EmailSendResult = {
  ok: boolean;
  error?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the invoice PDF to the client's email address as an attachment.
 * Requires SMTP_HOST / SMTP_USER / SMTP_PASS (and optionally SMTP_PORT,
 * SMTP_SECURE, EMAIL_FROM) to be set in the environment.
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  to: string
): Promise<EmailSendResult> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    });
    if (!invoice) return { ok: false, error: "Invoice not found" };

    const email = (to || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Client has no valid email address" };
    }

    const pdfResult = await getInvoicePdfById(invoiceId);
    if (!pdfResult) return { ok: false, error: "Invoice not found" };

    const company = await prisma.companySettings.findFirst();
    const companyName = company?.name || "WaveGuid";

    const totalStr = `${invoice.total.toFixed(2)} ${invoice.currency}`;
    const dueDateStr = invoice.dueDate.toISOString().slice(0, 10);
    const clientName = invoice.client?.name || "";

    const text = [
      `Dear ${clientName},`,
      "",
      `Please find attached invoice ${invoice.number} for ${totalStr}.`,
      `Due date: ${dueDateStr}.`,
      "",
      invoice.subject ? `Subject: ${invoice.subject}` : "",
      "Thank you,",
      companyName,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:520px">
  <p>Dear ${escapeHtml(clientName)},</p>
  <p>Please find attached invoice <strong>${escapeHtml(invoice.number)}</strong> for <strong>${escapeHtml(totalStr)}</strong>.</p>
  <p>Due date: <strong>${escapeHtml(dueDateStr)}</strong></p>
  ${invoice.notes ? `<p><em>${escapeHtml(invoice.notes)}</em></p>` : ""}
  <p>Thank you,<br/>${escapeHtml(companyName)}</p>
</div>`;

    const transport = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: { user: USER, pass: PASS },
    });

    await transport.sendMail({
      from: `${companyName} <${FROM}>`,
      to: email,
      subject: `Invoice ${invoice.number} — ${totalStr}`,
      text,
      html,
      attachments: [
        {
          filename: `${pdfResult.number}.pdf`,
          content: pdfResult.pdf,
          contentType: "application/pdf",
        },
      ],
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { emailSentAt: new Date() },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    console.error(`[email] invoice ${invoiceId}: ${message}`);
    return { ok: false, error: message };
  }
}
