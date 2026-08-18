import { z } from "zod";
import { roundMoney } from "./invoices";

export const PAYMENT_METHODS = ["Cash", "Bank transfer"] as const;

/** Allowed proof/receipt attachment types: pictures and PDF only */
export const PROOF_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

/** Base64 payload cap (~3 MB file -> ~4 MB base64), keeps requests within serverless limits */
export const PROOF_MAX_BASE64_LENGTH = 4 * 1024 * 1024;

export const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero")
    .refine((v) => roundMoney(v) === v, "Max 2 decimal places"),
  date: z.string().min(1, "Date is required"),
  method: z.enum(PAYMENT_METHODS).optional().nullable(),
  note: z.string().optional().nullable(),
  proofData: z
    .string()
    .refine(
      (v) =>
        !v ||
        new RegExp(
          `^data:(${PROOF_MIME_TYPES.join("|").replace(/\//g, "\\/")});base64,[A-Za-z0-9+/=]+$`
        ).test(v),
      "Proof must be a base64 data URL (picture or PDF only)"
    )
    .refine(
      (v) => !v || v.length <= PROOF_MAX_BASE64_LENGTH,
      "Proof file is too large (max ~3 MB)"
    )
    .optional()
    .nullable(),
  proofMime: z
    .string()
    .refine(
      (v) => !v || (PROOF_MIME_TYPES as readonly string[]).includes(v),
      "Only pictures (PNG, JPEG, WebP, GIF) and PDF files are allowed"
    )
    .optional()
    .nullable(),
  proofName: z.string().max(200).optional().nullable(),
});

/** Strips the data URL down to raw base64 + mime for storage */
export function parseProofDataUrl(dataUrl: string): {
  base64: string;
  mime: string;
} | null {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

export type PaymentInput = z.infer<typeof paymentSchema>;

type RecalcPrisma = {
  payment: {
    aggregate: (args: {
      where: { invoiceId: string };
      _sum: { amount: true };
    }) => Promise<{ _sum: { amount: number | null } }>;
  };
  invoice: {
    findUnique: (args: {
      where: { id: string };
      select: { status: true; total: true };
    }) => Promise<{ status: string; total: number } | null>;
    update: (args: {
      where: { id: string };
      data: { paidAmount: number; status?: string };
    }) => Promise<unknown>;
  };
};

/**
 * Recalculate an invoice's paidAmount from its payments and keep the
 * status in sync:
 *   - payments cover the total -> "fully_paid"
 *   - some payments, not full  -> "partly_paid"
 *   - no payments              -> "draft"
 */
export async function recalcInvoicePayments(
  prisma: RecalcPrisma,
  invoiceId: string
): Promise<number> {
  const [agg, invoice] = await Promise.all([
    prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    }),
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, total: true },
    }),
  ]);

  const paidAmount = roundMoney(agg._sum.amount ?? 0);

  if (!invoice) return paidAmount;

  const data: { paidAmount: number; status?: string } = { paidAmount };

  const fullyPaid = paidAmount > 0 && paidAmount >= invoice.total - 0.005;
  if (fullyPaid && invoice.status !== "fully_paid") {
    data.status = "fully_paid";
  } else if (!fullyPaid && invoice.status === "fully_paid") {
    data.status = paidAmount > 0 ? "partly_paid" : "draft";
  } else if (paidAmount > 0 && invoice.status === "draft") {
    data.status = "partly_paid";
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data });
  return paidAmount;
}
