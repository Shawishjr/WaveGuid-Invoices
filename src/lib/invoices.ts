import { z } from "zod";

export const VAT_RATE = 17;

export const invoiceStatuses = [
  "draft",
  "partly_paid",
  "fully_paid",
] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  partly_paid: "Partly paid",
  fully_paid: "Fully paid",
};

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

export const invoiceSchema = z
  .object({
    clientId: z.string().min(1).optional(),
    clientName: z.string().min(1).optional(),
    clientEmail: z.string().email().optional().or(z.literal("")),
    clientPhone: z.string().optional().or(z.literal("")),
    number: z.string().min(1).optional(),
    status: z.enum(invoiceStatuses).default("draft"),
    issueDate: z.string().min(1),
    dueDate: z.string().min(1),
    currency: z.string().default("USD"),
    notes: z.string().optional().nullable(),
    subject: z.string().optional().nullable(),
    taxRate: z.coerce.number().min(0).default(0),
    includeVat: z.boolean().default(false),
    templateId: z.string().min(1).optional().nullable(),
    items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
  })
  .refine((data) => data.clientId || data.clientName, {
    message: "Client is required",
    path: ["clientName"],
  });

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type ClientInput = z.infer<typeof clientSchema>;

export function calcTotals(
  items: { quantity: number; unitPrice: number }[],
  taxRate: number,
  includeVat = false
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const vatAmount = includeVat ? roundMoney((subtotal * VAT_RATE) / 100) : 0;
  const total = subtotal + taxAmount + vatAmount;
  return {
    subtotal: roundMoney(subtotal),
    taxAmount: roundMoney(taxAmount),
    vatAmount: roundMoney(vatAmount),
    total: roundMoney(total),
  };
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export async function nextInvoiceNumber(
  prisma: {
    invoice: {
      findFirst: (args: {
        orderBy: { number: "desc" };
        select: { number: true };
      }) => Promise<{ number: string } | null>;
    };
  }
) {
  const latest = await prisma.invoice.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });

  if (!latest?.number) return "INV-1001";

  const match = latest.number.match(/(\d+)/);
  if (!match) return `INV-${Date.now().toString().slice(-4)}`;

  const next = Number(match[1]) + 1;
  return `INV-${next}`;
}
