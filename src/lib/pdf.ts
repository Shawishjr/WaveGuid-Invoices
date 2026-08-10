import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { convertArabic } from "arabic-reshaper";
import { formatDate, formatMoney, VAT_RATE } from "./invoices";
import {
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  TemplateElement,
  resolvePlaceholders,
  defaultElements,
  TemplateData,
} from "./templates";

// ---- Arabic support -------------------------------------------------------
// PDFKit's built-in fonts are Latin-only, so Arabic glyphs render as tofu.
// We register an Arabic-capable TTF (Tahoma on Windows / Noto on Linux),
// reshape Arabic into connected presentation forms, and reverse for RTL.
const ARABIC_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function hasArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

function resolveArabicFont(weight: "regular" | "bold"): string | null {
  const windir = process.env.WINDIR || "C:\\Windows";
  const candidates =
    weight === "bold"
      ? [
          path.join(windir, "Fonts", "tahomabd.ttf"),
          path.join(windir, "Fonts", "arialbd.ttf"),
          path.join(windir, "Fonts", "arial.ttf"),
          "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
          "/usr/share/fonts/noto/NotoNaskhArabic-Bold.ttf",
        ]
      : [
          path.join(windir, "Fonts", "tahoma.ttf"),
          path.join(windir, "Fonts", "arial.ttf"),
          "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
          "/usr/share/fonts/noto/NotoNaskhArabic-Regular.ttf",
        ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

const ARABIC_REGULAR = resolveArabicFont("regular");
const ARABIC_BOLD = resolveArabicFont("bold") || ARABIC_REGULAR;
const ARABIC_AVAILABLE = Boolean(ARABIC_REGULAR);

const ARABIC_FONT_REGULAR = "WG-Arabic";
const ARABIC_FONT_BOLD = "WG-Arabic-Bold";

function registerArabicFonts(doc: PDFKit.PDFDocument) {
  if (!ARABIC_AVAILABLE) return;
  doc.registerFont(ARABIC_FONT_REGULAR, ARABIC_REGULAR!);
  doc.registerFont(ARABIC_FONT_BOLD, ARABIC_BOLD!);
}

/** Pick the right font face for a piece of text (Arabic vs Latin). */
function pickFont(el: TemplateElement, text: string): string {
  if (ARABIC_AVAILABLE && hasArabic(text)) {
    const isBold = (el.font || "").toLowerCase().includes("bold");
    return isBold ? ARABIC_FONT_BOLD : ARABIC_FONT_REGULAR;
  }
  return el.font || "Helvetica";
}

/** Reshape + reverse Arabic so PDFKit (no bidi) renders it correctly RTL. */
function shapeText(text: string): string {
  if (!text || !ARABIC_AVAILABLE || !hasArabic(text)) return text;
  try {
    return convertArabic(text)
      .split("")
      .reverse()
      .join("");
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------

export type PdfInvoice = {
  number: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  notes: string | null;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  vatAmount: number;
  total: number;
  client: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
};

export type PdfCompany = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
};

function buildTemplateData(invoice: PdfInvoice, company: PdfCompany): TemplateData {
  const currency = invoice.currency;
  return {
    company: {
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      website: company.website,
    },
    client: {
      name: invoice.client.name,
      company: invoice.client.company,
      email: invoice.client.email,
      phone: invoice.client.phone,
      address: invoice.client.address,
    },
    invoice: {
      number: invoice.number,
      status: invoice.status,
      issueDate: formatDate(invoice.issueDate),
      dueDate: formatDate(invoice.dueDate),
      currency,
      notes: invoice.notes,
      taxRate: invoice.taxRate,
      subtotal: formatMoney(invoice.subtotal, currency),
      taxAmount: formatMoney(invoice.taxAmount, currency),
      vatAmount: formatMoney(invoice.vatAmount, currency),
      total: formatMoney(invoice.total, currency),
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
  };
}

function isBlank(value?: string): boolean {
  return !value || value.toLowerCase() === "none" || value.trim() === "";
}

type AnyDoc = InstanceType<typeof PDFDocument> & {
  // helpers (some are already public on PDFDocument)
};

function drawText(
  doc: AnyDoc,
  el: TemplateElement,
  data: TemplateData
) {
  const raw = resolvePlaceholders(el.content || "", data);
  if (!raw) return;
  const content = shapeText(raw);
  doc
    .fillColor(el.color || "#0f172a")
    .fontSize(el.fontSize || 11)
    .font(pickFont(el, raw))
    .text(content, el.x, el.y, {
      width: el.w,
      align: el.align || "left",
      lineGap: 2,
    });
}

function drawLine(doc: AnyDoc, el: TemplateElement) {
  doc
    .strokeColor(el.strokeColor || "#94a3b8")
    .lineWidth(el.strokeWidth || 1)
    .moveTo(el.x, el.y)
    .lineTo(el.x + el.w, el.y)
    .stroke();
}

function drawRect(doc: AnyDoc, el: TemplateElement) {
  const hasFill = !isBlank(el.fillColor);
  const hasStroke = !isBlank(el.strokeColor);
  doc.lineWidth(el.strokeWidth || 1);
  if (hasFill && hasStroke) {
    doc.rect(el.x, el.y, el.w, el.h).fillAndStroke(el.fillColor!, el.strokeColor!);
  } else if (hasFill) {
    doc.rect(el.x, el.y, el.w, el.h).fill(el.fillColor!);
  } else if (hasStroke) {
    doc.rect(el.x, el.y, el.w, el.h).stroke(el.strokeColor!);
  }
}

function drawItems(
  doc: AnyDoc,
  el: TemplateElement,
  data: TemplateData
) {
  const currency = data.invoice.currency;
  const fontSize = el.fontSize || 9;
  const font = el.font || "Helvetica";
  const color = el.color || "#0f172a";
  const muted = "#64748b";

  const descW = el.w * 0.5;
  const qtyX = el.x + el.w * 0.55;
  const qtyW = el.w * 0.12;
  const rateX = el.x + el.w * 0.67;
  const rateW = el.w * 0.16;
  const amountX = el.x + el.w * 0.83;
  const amountW = el.w * 0.17;

  let y = el.y;

  // Header
  doc.fillColor(muted).fontSize(fontSize - 1).font("Helvetica-Bold");
  doc.text("DESCRIPTION", el.x, y, { width: descW });
  doc.text("QTY", qtyX, y, { width: qtyW, align: "right" });
  doc.text("RATE", rateX, y, { width: rateW, align: "right" });
  doc.text("AMOUNT", amountX, y, { width: amountW, align: "right" });
  y += fontSize + 8;

  doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(el.x, y).lineTo(el.x + el.w, y).stroke();
  y += 8;

  doc.font(font).fontSize(fontSize).fillColor(color);

  for (const item of data.items) {
    if (y > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    const desc = shapeText(item.description);
    doc.font(pickFont(el, item.description)).text(desc, el.x, y, { width: descW });
    doc.text(String(item.quantity), qtyX, y, { width: qtyW, align: "right" });
    doc.text(formatMoney(item.unitPrice, currency), rateX, y, { width: rateW, align: "right" });
    doc.text(formatMoney(item.amount, currency), amountX, y, { width: amountW, align: "right" });
    const descHeight = doc.heightOfString(desc, { width: descW });
    y += Math.max(descHeight, fontSize) + 6;
  }
}

function drawTotals(
  doc: AnyDoc,
  el: TemplateElement,
  data: TemplateData
) {
  const fontSize = el.fontSize || 10;
  const color = el.color || "#0f172a";
  const muted = "#64748b";
  const labelW = el.w * 0.55;
  const valueX = el.x + el.w * 0.45;
  const valueW = el.w * 0.55;

  let y = el.y;

  const row = (label: string, value: string, bold: boolean) => {
    doc
      .fillColor(muted)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(fontSize)
      .text(label, el.x, y, { width: labelW });
    doc
      .fillColor(color)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .text(value, valueX, y, { width: valueW, align: "right" });
    y += fontSize + 8;
  };

  row("Subtotal", data.invoice.subtotal, false);
  row(`Tax (${data.invoice.taxRate}%)`, data.invoice.taxAmount, false);
  if (data.invoice.vatAmount !== formatMoney(0, data.invoice.currency)) {
    row(`VAT (${VAT_RATE}%)`, data.invoice.vatAmount, false);
  }
  doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(el.x, y).lineTo(el.x + el.w, y).stroke();
  y += 6;
  row("Grand total", data.invoice.total, true);
}

function dataUrlToBuffer(src: string): Buffer {
  const comma = src.indexOf(",");
  const b64 = comma >= 0 ? src.slice(comma + 1) : src;
  return Buffer.from(b64, "base64");
}

function drawImage(doc: AnyDoc, el: TemplateElement) {
  if (!el.src) return;
  try {
    const buf = dataUrlToBuffer(el.src);
    if (el.fit === "stretch") {
      doc.image(buf, el.x, el.y, { width: el.w, height: el.h });
    } else {
      doc.image(buf, el.x, el.y, {
        fit: [el.w, el.h],
        align: "center",
        valign: "center",
      });
    }
  } catch (err) {
    // Unsupported format or broken image — draw a placeholder box.
    doc
      .strokeColor("#94a3b8")
      .lineWidth(1)
      .dash(3, { space: 3 })
      .rect(el.x, el.y, el.w, el.h)
      .stroke()
      .undash();
    doc
      .fillColor("#94a3b8")
      .fontSize(8)
      .font("Helvetica")
      .text("Image", el.x, el.y + el.h / 2 - 4, {
        width: el.w,
        align: "center",
      });
  }
}

function drawStamp(doc: AnyDoc, el: TemplateElement, data: TemplateData) {
  const raw = resolvePlaceholders(el.content || "", data) || "STAMP";
  const text = shapeText(raw);
  const color = el.color || "#c70d3a";
  const fontSize = el.fontSize || 28;
  const angle = el.angle ?? -18;
  const strokeW = el.strokeWidth ?? 3;

  doc.save();
  doc.translate(el.x + el.w / 2, el.y + el.h / 2);
  doc.rotate(angle);
  doc
    .strokeColor(color)
    .lineWidth(strokeW)
    .roundedRect(-el.w / 2, -el.h / 2, el.w, el.h, 12)
    .stroke();
  doc.lineWidth(1).roundedRect(-el.w / 2 + 5, -el.h / 2 + 5, el.w - 10, el.h - 10, 8).stroke();
  doc
    .fillColor(color)
    .font(pickFont({ ...el, font: el.font || "Helvetica-Bold" }, raw))
    .fontSize(fontSize)
    .text(text, -el.w / 2, -fontSize / 2, {
      width: el.w,
      align: "center",
    });
  doc.restore();
}

function renderElements(
  doc: AnyDoc,
  elements: TemplateElement[],
  data: TemplateData
) {
  for (const el of elements) {
    switch (el.type) {
      case "text":
        drawText(doc, el, data);
        break;
      case "line":
        drawLine(doc, el);
        break;
      case "rect":
        drawRect(doc, el);
        break;
      case "items":
        drawItems(doc, el, data);
        break;
      case "totals":
        drawTotals(doc, el, data);
        break;
      case "image":
        drawImage(doc, el);
        break;
      case "stamp":
        drawStamp(doc, el, data);
        break;
    }
  }
}

export function renderTemplatePdf(
  invoice: PdfInvoice,
  company: PdfCompany,
  elements: TemplateElement[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    registerArabicFonts(doc);

    const data = buildTemplateData(invoice, company);
    renderElements(doc as AnyDoc, elements, data);

    doc.end();
  });
}

/** Backward-compatible helper — renders using the default "Classic" layout. */
export function buildInvoicePdf(
  invoice: PdfInvoice,
  company: PdfCompany,
  elements?: TemplateElement[]
): Promise<Buffer> {
  return renderTemplatePdf(invoice, company, elements ?? defaultElements());
}
