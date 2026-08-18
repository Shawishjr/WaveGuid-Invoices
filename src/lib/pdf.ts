import { existsSync } from "fs";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { formatDate, formatMoney, VAT_RATE } from "./invoices";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TemplateElement,
  resolvePlaceholders,
  defaultElements,
  TemplateData,
} from "./templates";

export type PdfInvoice = {
  number: string;
  subject: string | null;
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
      subject: invoice.subject || "",
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

// ---------- HTML rendering of template elements ----------

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c] as string)
  );
}

function fontCss(font?: string): string {
  const f = (font || "Helvetica").toLowerCase();
  if (f.startsWith("times")) return "'Times New Roman', Times, serif";
  if (f.startsWith("courier")) return "'Courier New', Courier, monospace";
  return "Helvetica, Arial, sans-serif";
}

function isBold(font?: string): number {
  return (font || "").toLowerCase().includes("bold") ? 700 : 400;
}

function pos(el: TemplateElement): string {
  return `position:absolute;left:${el.x}pt;top:${el.y}pt;width:${el.w}pt;`;
}

function textElement(el: TemplateElement, data: TemplateData): string {
  const content = escapeHtml(resolvePlaceholders(el.content || "", data));
  if (!content) return "";
  return `<div style="${pos(el)}height:${el.h}pt;font-family:${fontCss(
    el.font
  )};font-weight:${isBold(el.font)};font-size:${el.fontSize || 11}pt;color:${
    el.color || "#0f172a"
  };text-align:${el.align || "left"};line-height:1.3;white-space:pre-wrap;overflow:hidden;">${content}</div>`;
}

function lineElement(el: TemplateElement): string {
  return `<div style="${pos(el)}height:${
    el.strokeWidth || 1
  }pt;background:${el.strokeColor || "#94a3b8"};"></div>`;
}

function rectElement(el: TemplateElement): string {
  const fill =
    !el.fillColor || el.fillColor === "none" ? "transparent" : el.fillColor;
  const stroke =
    !el.strokeColor || el.strokeColor === "none"
      ? "transparent"
      : el.strokeColor;
  return `<div style="${pos(el)}height:${el.h}pt;background:${fill};border:${
    el.strokeWidth || 1
  }pt solid ${stroke};"></div>`;
}

function itemsElement(el: TemplateElement, data: TemplateData): string {
  const fs = el.fontSize || 9;
  const fam = fontCss(el.font);
  const col = el.color || "#0f172a";
  const currency = data.invoice.currency;

  const rows = data.items
    .map(
      (it) => `<tr>
        <td style="width:50%;padding:3px 0;border-bottom:1px solid #f1f5f9;text-align:left;">${escapeHtml(
          it.description
        )}</td>
        <td style="width:12%;padding:3px 4px;border-bottom:1px solid #f1f5f9;text-align:right;">${
          it.quantity
        }</td>
        <td style="width:18%;padding:3px 4px;border-bottom:1px solid #f1f5f9;text-align:right;">${formatMoney(
          it.unitPrice,
          currency
        )}</td>
        <td style="width:20%;padding:3px 0;border-bottom:1px solid #f1f5f9;text-align:right;">${formatMoney(
          it.amount,
          currency
        )}</td>
      </tr>`
    )
    .join("");

  return `<div style="${pos(el)}font-family:${fam};font-size:${fs}pt;color:${col};">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead><tr style="color:#64748b;font-weight:700;font-size:${
        fs - 1
      }pt;border-bottom:1px solid #e2e8f0;">
        <th style="width:50%;padding:0 0 5px;text-align:left;font-weight:700;">DESCRIPTION</th>
        <th style="width:12%;text-align:right;font-weight:700;">QTY</th>
        <th style="width:18%;text-align:right;font-weight:700;">RATE</th>
        <th style="width:20%;text-align:right;font-weight:700;">AMOUNT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function totalsElement(el: TemplateElement, data: TemplateData): string {
  const fs = el.fontSize || 10;
  const fam = fontCss(el.font);
  const col = el.color || "#0f172a";
  const muted = "#64748b";
  const currency = data.invoice.currency;
  const showVat = data.invoice.vatAmount !== formatMoney(0, currency);

  const rows: string[] = [];
  const push = (label: string, value: string) => {
    rows.push(
      `<tr><td style="color:${muted};padding:2px 0;text-align:left;">${label}</td><td style="color:${col};padding:2px 0;text-align:right;">${value}</td></tr>`
    );
  };
  push("Subtotal", data.invoice.subtotal);
  if (showVat) push(`VAT (${VAT_RATE}%)`, data.invoice.vatAmount);
  rows.push(
    `<tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:4px;"></td></tr>`
  );
  rows.push(
    `<tr style="font-weight:700;"><td style="color:${col};padding-top:2px;text-align:left;">Total</td><td style="color:${col};padding-top:2px;text-align:right;">${data.invoice.total}</td></tr>`
  );

  return `<div style="${pos(el)}font-family:${fam};font-size:${fs}pt;color:${col};">
    <table style="width:100%;border-collapse:collapse;">${rows.join("")}</table>
  </div>`;
}

function imageElement(el: TemplateElement): string {
  if (!el.src) return "";
  const fit = el.fit === "stretch" ? "fill" : "contain";
  return `<img src="${el.src}" style="${pos(el)}height:${el.h}pt;object-fit:${fit};" />`;
}

function stampElement(el: TemplateElement, data: TemplateData): string {
  const text = escapeHtml(
    resolvePlaceholders(el.content || "", data) || "STAMP"
  );
  const col = el.color || "#c70d3a";
  const fs = el.fontSize || 28;
  const angle = el.angle ?? -18;
  const sw = el.strokeWidth ?? 3;
  return `<div style="${pos(el)}height:${el.h}pt;display:flex;align-items:center;justify-content:center;">
    <div style="transform:rotate(${angle}deg);border:${sw}pt solid ${col};outline:1pt solid ${col};outline-offset:4pt;border-radius:12pt;color:${col};font-weight:700;font-size:${fs}pt;letter-spacing:0.05em;padding:8pt 16pt;text-align:center;">${text}</div>
  </div>`;
}

function elementToHtml(el: TemplateElement, data: TemplateData): string {
  switch (el.type) {
    case "text":
      return textElement(el, data);
    case "line":
      return lineElement(el);
    case "rect":
      return rectElement(el);
    case "items":
      return itemsElement(el, data);
    case "totals":
      return totalsElement(el, data);
    case "image":
      return imageElement(el);
    case "stamp":
      return stampElement(el, data);
    default:
      return "";
  }
}

function buildHtml(elements: TemplateElement[], data: TemplateData): string {
  const body = elements.map((el) => elementToHtml(el, data)).join("\n");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><style>
  @page { size: ${PAGE_WIDTH}pt ${PAGE_HEIGHT}pt; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #ffffff; }
  body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; }
  .page { position: relative; width: ${PAGE_WIDTH}pt; height: ${PAGE_HEIGHT}pt; overflow: hidden; background: #ffffff; }
  table { border-collapse: collapse; }
</style></head>
<body><div class="page">${body}</div></body></html>`;
}

// ---------- Chromium rendering ----------

let browserPromise: Promise<Browser> | null = null;

const LOCAL_BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((p): p is string => Boolean(p));

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      if (process.platform === "win32") {
        const executablePath = LOCAL_BROWSER_CANDIDATES.find((p) => existsSync(p));
        if (!executablePath) {
          throw new Error(
            "No Chrome/Edge installation found. Install Chrome or set CHROME_PATH."
          );
        }
        return puppeteer.launch({
          headless: true,
          executablePath,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }
      // Serverless (Vercel etc.): use the bundled headless-shell from @sparticuz/chromium
      return puppeteer.launch({
        headless: "shell",
        executablePath: await chromium.executablePath(),
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      });
    })();
  }
  return browserPromise;
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function renderTemplatePdf(
  invoice: PdfInvoice,
  company: PdfCompany,
  elements: TemplateElement[]
): Promise<Buffer> {
  const data = buildTemplateData(invoice, company);
  const html = buildHtml(elements, data);
  try {
    return await htmlToPdf(html);
  } catch (err) {
    // Reset the cached browser so the next attempt launches a fresh one.
    browserPromise = null;
    throw err;
  }
}

/** Backward-compatible helper — renders using the default "Classic" layout. */
export function buildInvoicePdf(
  invoice: PdfInvoice,
  company: PdfCompany,
  elements?: TemplateElement[]
): Promise<Buffer> {
  return renderTemplatePdf(invoice, company, elements ?? defaultElements());
}
