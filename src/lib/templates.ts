import { z } from "zod";
import { formatDate, formatMoney } from "./invoices";

export const PAGE_WIDTH = 595; // A4 in points (595.28)
export const PAGE_HEIGHT = 842; // A4 in points (841.89)
export const PAGE_MARGIN = 40;

export const ELEMENT_TYPES = [
  "text",
  "line",
  "rect",
  "items",
  "totals",
  "image",
  "stamp",
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export const FONT_OPTIONS = [
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Courier",
  "Courier-Bold",
] as const;

export type FontOption = (typeof FONT_OPTIONS)[number];

export const ALIGN_OPTIONS = ["left", "center", "right"] as const;
export type AlignOption = (typeof ALIGN_OPTIONS)[number];

export const IMAGE_FIT_OPTIONS = ["contain", "stretch"] as const;
export type ImageFitOption = (typeof IMAGE_FIT_OPTIONS)[number];

export const templateElementSchema = z.object({
  id: z.string(),
  type: z.enum(ELEMENT_TYPES),
  x: z.coerce.number(),
  y: z.coerce.number(),
  w: z.coerce.number(),
  h: z.coerce.number(),
  content: z.string().optional(),
  fontSize: z.coerce.number().optional(),
  font: z.enum(FONT_OPTIONS).optional(),
  color: z.string().optional(),
  align: z.enum(ALIGN_OPTIONS).optional(),
  strokeColor: z.string().optional(),
  fillColor: z.string().optional(),
  strokeWidth: z.coerce.number().optional(),
  src: z.string().optional(),
  fit: z.enum(IMAGE_FIT_OPTIONS).optional(),
  angle: z.coerce.number().optional(),
});

export type TemplateElement = z.infer<typeof templateElementSchema>;

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  elements: z.array(templateElementSchema).default([]),
});

export type Template = z.infer<typeof templateSchema>;

export type TemplateData = {
  company: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
  };
  client: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  invoice: {
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    notes: string | null;
    taxRate: number;
    subtotal: string;
    taxAmount: string;
    total: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
};

/** Sample data used by the editor canvas + PDF preview. */
export const SAMPLE_DATA: TemplateData = {
  company: {
    name: "WaveGuid",
    email: "billing@waveguid.com",
    phone: "+1 (555) 010-2000",
    address: "120 Harbor Avenue, Suite 400\nSan Francisco, CA 94105",
    website: "https://waveguid.com",
  },
  client: {
    name: "Jordan Lee",
    company: "Acme Studios",
    email: "jordan@acmestudios.com",
    phone: "+1 (555) 221-8844",
    address: "88 Market Street\nNew York, NY 10013",
  },
  invoice: {
    number: "INV-1001",
    status: "sent",
    issueDate: formatDate(new Date()),
    dueDate: formatDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),
    currency: "USD",
    notes: "Payment due within 30 days. Thank you for your business.",
    taxRate: 8.5,
    subtotal: formatMoney(6960, "USD"),
    taxAmount: formatMoney(591.6, "USD"),
    total: formatMoney(7551.6, "USD"),
  },
  items: [
    { description: "Brand identity package", quantity: 1, unitPrice: 2400, amount: 2400 },
    { description: "Website design (landing + 4 pages)", quantity: 1, unitPrice: 3800, amount: 3800 },
    { description: "Design system documentation", quantity: 8, unitPrice: 95, amount: 760 },
  ],
};

const PLACEHOLDER_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Replace {{company.name}} style placeholders with values from data. */
export function resolvePlaceholders(text: string, data: TemplateData): string {
  return text.replace(PLACEHOLDER_REGEX, (match, key: string) => {
    const value = getDeepValue(data, key.trim());
    return value ?? match;
  });
}

function getDeepValue(obj: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return "";
  if (typeof current === "number") return String(current);
  return String(current);
}

export function parseElements(raw: string | null | undefined): TemplateElement[] {
  if (!raw) return [];
  try {
    const parsed = z.array(templateElementSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function serializeElements(elements: TemplateElement[]): string {
  return JSON.stringify(elements);
}

let elementIdCounter = 0;
export function generateElementId(): string {
  elementIdCounter += 1;
  return `el_${Date.now().toString(36)}_${elementIdCounter}`;
}

export function createElement(type: ElementType): TemplateElement {
  const base = {
    id: generateElementId(),
    x: 50,
    y: 120,
    w: 300,
    h: 24,
  };
  switch (type) {
    case "text":
      return { ...base, type, content: "New text", fontSize: 11, font: "Helvetica", color: "#0f172a", align: "left" };
    case "line":
      return { ...base, y: 200, h: 1, type, strokeColor: "#94a3b8", strokeWidth: 1 };
    case "rect":
      return { ...base, y: 80, h: 60, type, fillColor: "#e2e8f0", strokeColor: "#94a3b8", strokeWidth: 1 };
    case "items":
      return { ...base, x: 40, y: 360, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 120, type, fontSize: 9, font: "Helvetica", color: "#0f172a" };
    case "totals":
      return { ...base, x: PAGE_WIDTH - PAGE_MARGIN - 220, y: 520, w: 220, h: 90, type, fontSize: 10, font: "Helvetica", color: "#0f172a" };
    case "image":
      return { ...base, y: 60, w: 160, h: 60, type, src: "", fit: "contain" };
    case "stamp":
      return {
        ...base,
        x: PAGE_WIDTH - PAGE_MARGIN - 200,
        y: 360,
        w: 200,
        h: 90,
        type,
        content: "PAID",
        fontSize: 34,
        color: "#c70d3a",
        strokeColor: "#c70d3a",
        strokeWidth: 3,
        angle: -18,
      };
    default:
      return { ...base, type: "text", content: "New text" };
  }
}

/** Default "Classic" layout — mirrors the original built-in PDF design. */
export function defaultElements(): TemplateElement[] {
  return [
    { id: generateElementId(), type: "text", x: 40, y: 40, w: 300, h: 28, content: "{{company.name}}", fontSize: 22, font: "Helvetica-Bold", color: "#0d9488", align: "left" },
    { id: generateElementId(), type: "text", x: 360, y: 44, w: 195, h: 20, content: "INVOICE", fontSize: 10, font: "Helvetica-Bold", color: "#64748b", align: "right" },
    { id: generateElementId(), type: "text", x: 360, y: 62, w: 195, h: 24, content: "{{invoice.number}}", fontSize: 18, font: "Helvetica-Bold", color: "#0f172a", align: "right" },
    { id: generateElementId(), type: "text", x: 40, y: 130, w: 200, h: 12, content: "FROM", fontSize: 9, font: "Helvetica-Bold", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 146, w: 200, h: 70, content: "{{company.name}}\n{{company.address}}\n{{company.email}}\n{{company.phone}}", fontSize: 9, font: "Helvetica", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 300, y: 130, w: 200, h: 12, content: "BILL TO", fontSize: 9, font: "Helvetica-Bold", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 300, y: 146, w: 200, h: 70, content: "{{client.company}}\n{{client.name}}\n{{client.address}}\n{{client.email}}", fontSize: 9, font: "Helvetica", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 240, w: 120, h: 12, content: "ISSUE DATE", fontSize: 9, font: "Helvetica-Bold", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 256, w: 120, h: 14, content: "{{invoice.issueDate}}", fontSize: 10, font: "Helvetica", color: "#0f172a", align: "left" },
    { id: generateElementId(), type: "text", x: 170, y: 240, w: 120, h: 12, content: "DUE DATE", fontSize: 9, font: "Helvetica-Bold", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 170, y: 256, w: 120, h: 14, content: "{{invoice.dueDate}}", fontSize: 10, font: "Helvetica", color: "#0f172a", align: "left" },
    { id: generateElementId(), type: "text", x: 300, y: 240, w: 120, h: 12, content: "STATUS", fontSize: 9, font: "Helvetica-Bold", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 300, y: 256, w: 120, h: 14, content: "{{invoice.status}}", fontSize: 10, font: "Helvetica-Bold", color: "#0d9488", align: "left" },
    { id: generateElementId(), type: "line", x: 40, y: 300, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 1, strokeColor: "#e2e8f0", strokeWidth: 1 },
    { id: generateElementId(), type: "items", x: 40, y: 320, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 160, fontSize: 10, font: "Helvetica", color: "#0f172a" },
    { id: generateElementId(), type: "totals", x: PAGE_WIDTH - PAGE_MARGIN - 220, y: 520, w: 220, h: 90, fontSize: 10, font: "Helvetica", color: "#0f172a" },
    { id: generateElementId(), type: "text", x: 40, y: 640, w: 400, h: 12, content: "NOTES", fontSize: 9, font: "Helvetica-Bold", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 656, w: 400, h: 60, content: "{{invoice.notes}}", fontSize: 10, font: "Helvetica", color: "#0f172a", align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 800, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 14, content: "Generated by WaveGuid Invoices", fontSize: 8, font: "Helvetica", color: "#64748b", align: "center" },
  ];
}

function minimalElements(): TemplateElement[] {
  const ink = "#111111";
  const muted = "#666666";
  return [
    { id: generateElementId(), type: "text", x: 40, y: 50, w: 300, h: 18, content: "{{company.name}}", fontSize: 14, font: "Helvetica-Bold", color: ink, align: "left" },
    { id: generateElementId(), type: "text", x: 360, y: 50, w: 195, h: 24, content: "Invoice {{invoice.number}}", fontSize: 12, font: "Helvetica", color: muted, align: "right" },
    { id: generateElementId(), type: "line", x: 40, y: 84, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 1, strokeColor: "#111111", strokeWidth: 1 },
    { id: generateElementId(), type: "text", x: 40, y: 100, w: 220, h: 60, content: "{{company.address}}\n{{company.email}}", fontSize: 9, font: "Helvetica", color: muted, align: "left" },
    { id: generateElementId(), type: "text", x: 300, y: 100, w: 220, h: 60, content: "Billed to\n{{client.company}}\n{{client.name}}", fontSize: 9, font: "Helvetica", color: muted, align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 180, w: 160, h: 12, content: "Issued {{invoice.issueDate}}", fontSize: 9, font: "Helvetica", color: muted, align: "left" },
    { id: generateElementId(), type: "text", x: 200, y: 180, w: 160, h: 12, content: "Due {{invoice.dueDate}}", fontSize: 9, font: "Helvetica", color: muted, align: "left" },
    { id: generateElementId(), type: "items", x: 40, y: 220, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 160, fontSize: 9, font: "Helvetica", color: ink },
    { id: generateElementId(), type: "totals", x: PAGE_WIDTH - PAGE_MARGIN - 200, y: 460, w: 200, h: 80, fontSize: 10, font: "Helvetica", color: ink },
  ];
}

function boldElements(): TemplateElement[] {
  const white = "#ffffff";
  const ink = "#0f172a";
  const accent = "#c70d3a";
  return [
    { id: generateElementId(), type: "rect", x: 0, y: 0, w: PAGE_WIDTH, h: 90, fillColor: accent, strokeColor: "none", strokeWidth: 0 },
    { id: generateElementId(), type: "text", x: 40, y: 32, w: 320, h: 28, content: "{{company.name}}", fontSize: 24, font: "Helvetica-Bold", color: white, align: "left" },
    { id: generateElementId(), type: "text", x: 360, y: 36, w: 195, h: 24, content: "INVOICE", fontSize: 11, font: "Helvetica-Bold", color: white, align: "right" },
    { id: generateElementId(), type: "text", x: 360, y: 56, w: 195, h: 22, content: "{{invoice.number}}", fontSize: 16, font: "Helvetica-Bold", color: white, align: "right" },
    { id: generateElementId(), type: "text", x: 40, y: 120, w: 220, h: 70, content: "From\n{{company.name}}\n{{company.address}}\n{{company.email}}", fontSize: 9, font: "Helvetica", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 300, y: 120, w: 220, h: 70, content: "Bill to\n{{client.company}}\n{{client.name}}\n{{client.address}}", fontSize: 9, font: "Helvetica", color: "#64748b", align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 210, w: 120, h: 12, content: "ISSUED", fontSize: 8, font: "Helvetica-Bold", color: accent, align: "left" },
    { id: generateElementId(), type: "text", x: 40, y: 226, w: 120, h: 14, content: "{{invoice.issueDate}}", fontSize: 10, font: "Helvetica", color: ink, align: "left" },
    { id: generateElementId(), type: "text", x: 170, y: 210, w: 120, h: 12, content: "DUE", fontSize: 8, font: "Helvetica-Bold", color: accent, align: "left" },
    { id: generateElementId(), type: "text", x: 170, y: 226, w: 120, h: 14, content: "{{invoice.dueDate}}", fontSize: 10, font: "Helvetica", color: ink, align: "left" },
    { id: generateElementId(), type: "rect", x: 40, y: 260, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 24, fillColor: "#0f172a", strokeColor: "none", strokeWidth: 0 },
    { id: generateElementId(), type: "items", x: 40, y: 296, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: 160, fontSize: 10, font: "Helvetica", color: ink },
    { id: generateElementId(), type: "totals", x: PAGE_WIDTH - PAGE_MARGIN - 220, y: 500, w: 220, h: 90, fontSize: 11, font: "Helvetica", color: ink },
    { id: generateElementId(), type: "text", x: 40, y: 640, w: 400, h: 60, content: "{{invoice.notes}}", fontSize: 9, font: "Helvetica", color: "#64748b", align: "left" },
  ];
}

export const TEMPLATE_DRAFTS: { name: string; elements: () => TemplateElement[] }[] = [
  { name: "Classic", elements: defaultElements },
  { name: "Minimal", elements: minimalElements },
  { name: "Bold", elements: boldElements },
];

/** A short list of placeholders surfaced in the editor UI. */
export const PLACEHOLDER_HINTS: { token: string; label: string }[] = [
  { token: "{{company.name}}", label: "Company name" },
  { token: "{{company.address}}", label: "Company address" },
  { token: "{{company.email}}", label: "Company email" },
  { token: "{{company.phone}}", label: "Company phone" },
  { token: "{{company.website}}", label: "Company website" },
  { token: "{{client.name}}", label: "Client name" },
  { token: "{{client.company}}", label: "Client company" },
  { token: "{{client.address}}", label: "Client address" },
  { token: "{{client.email}}", label: "Client email" },
  { token: "{{invoice.number}}", label: "Invoice number" },
  { token: "{{invoice.status}}", label: "Status" },
  { token: "{{invoice.issueDate}}", label: "Issue date" },
  { token: "{{invoice.dueDate}}", label: "Due date" },
  { token: "{{invoice.notes}}", label: "Notes" },
  { token: "{{invoice.subtotal}}", label: "Subtotal" },
  { token: "{{invoice.taxRate}}", label: "Tax rate" },
  { token: "{{invoice.taxAmount}}", label: "Tax amount" },
  { token: "{{invoice.total}}", label: "Total" },
];
