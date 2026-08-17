import { z } from "zod";
import { roundMoney } from "./invoices";

export const PAYMENT_METHODS = [
  "Cash",
  "Bank transfer",
  "Card",
  "Cheque",
  "Online",
  "Other",
] as const;

export const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero")
    .refine((v) => roundMoney(v) === v, "Max 2 decimal places"),
  date: z.string().min(1, "Date is required"),
  method: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

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
 *   - fully paid            -> "paid"
 *   - no longer fully paid  -> back to "sent" (only if it was "paid")
 * Draft / cancelled invoices keep their status untouched.
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

  if (invoice.status !== "draft" && invoice.status !== "cancelled") {
    const fullyPaid = paidAmount > 0 && paidAmount >= invoice.total - 0.005;
    if (fullyPaid && invoice.status !== "paid") {
      data.status = "paid";
    } else if (!fullyPaid && invoice.status === "paid") {
      data.status = "sent";
    }
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data });
  return paidAmount;
}
