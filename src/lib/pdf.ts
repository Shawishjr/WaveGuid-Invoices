import PDFDocument from "pdfkit";
import { formatDate, formatMoney } from "./invoices";

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

export function buildInvoicePdf(
  invoice: PdfInvoice,
  company: PdfCompany
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ink = "#0f172a";
    const muted = "#64748b";
    const accent = "#0d9488";
    const line = "#e2e8f0";

    doc.fillColor(accent).fontSize(22).font("Helvetica-Bold").text(company.name);
    doc
      .fillColor(muted)
      .fontSize(10)
      .font("Helvetica")
      .text("INVOICE", { align: "right" });

    doc.moveDown(0.3);
    doc.fillColor(ink).fontSize(18).font("Helvetica-Bold").text(invoice.number, {
      align: "right",
    });

    doc.moveDown(0.8);
    const leftX = 50;
    const rightX = 320;
    let y = doc.y;

    doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("FROM", leftX, y);
    doc
      .fillColor(ink)
      .fontSize(11)
      .font("Helvetica")
      .text(company.name, leftX, y + 14);
    let fromY = y + 28;
    if (company.address) {
      doc.fillColor(muted).fontSize(9).text(company.address, leftX, fromY, {
        width: 200,
      });
      fromY = doc.y + 4;
    }
    if (company.email) {
      doc.text(company.email, leftX, fromY);
      fromY = doc.y + 2;
    }
    if (company.phone) {
      doc.text(company.phone, leftX, fromY);
      fromY = doc.y + 2;
    }
    if (company.website) {
      doc.text(company.website, leftX, fromY);
    }

    doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("BILL TO", rightX, y);
    doc
      .fillColor(ink)
      .fontSize(11)
      .font("Helvetica")
      .text(invoice.client.company || invoice.client.name, rightX, y + 14);
    let toY = y + 28;
    if (invoice.client.company) {
      doc.fillColor(muted).fontSize(9).text(invoice.client.name, rightX, toY);
      toY = doc.y + 2;
    }
    if (invoice.client.address) {
      doc.text(invoice.client.address, rightX, toY, { width: 200 });
      toY = doc.y + 4;
    }
    if (invoice.client.email) {
      doc.text(invoice.client.email, rightX, toY);
      toY = doc.y + 2;
    }
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, rightX, toY);
    }

    doc.y = Math.max(doc.y, fromY, toY) + 24;

    const metaY = doc.y;
    doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("ISSUE DATE", leftX, metaY);
    doc
      .fillColor(ink)
      .font("Helvetica")
      .fontSize(10)
      .text(formatDate(invoice.issueDate), leftX, metaY + 14);

    doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("DUE DATE", 180, metaY);
    doc
      .fillColor(ink)
      .font("Helvetica")
      .fontSize(10)
      .text(formatDate(invoice.dueDate), 180, metaY + 14);

    doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("STATUS", 310, metaY);
    doc
      .fillColor(accent)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(invoice.status.toUpperCase(), 310, metaY + 14);

    doc.moveDown(2.5);
    const tableTop = doc.y;

    doc
      .strokeColor(line)
      .lineWidth(1)
      .moveTo(50, tableTop)
      .lineTo(545, tableTop)
      .stroke();

    const headerY = tableTop + 10;
    doc.fillColor(muted).fontSize(8).font("Helvetica-Bold");
    doc.text("DESCRIPTION", 50, headerY, { width: 250 });
    doc.text("QTY", 310, headerY, { width: 50, align: "right" });
    doc.text("RATE", 370, headerY, { width: 70, align: "right" });
    doc.text("AMOUNT", 450, headerY, { width: 95, align: "right" });

    doc
      .moveTo(50, headerY + 18)
      .lineTo(545, headerY + 18)
      .stroke();

    let rowY = headerY + 28;
    doc.font("Helvetica").fontSize(10).fillColor(ink);

    for (const item of invoice.items) {
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }

      doc.text(item.description, 50, rowY, { width: 250 });
      const descHeight = doc.heightOfString(item.description, { width: 250 });
      doc.text(String(item.quantity), 310, rowY, { width: 50, align: "right" });
      doc.text(formatMoney(item.unitPrice, invoice.currency), 370, rowY, {
        width: 70,
        align: "right",
      });
      doc.text(formatMoney(item.amount, invoice.currency), 450, rowY, {
        width: 95,
        align: "right",
      });
      rowY += Math.max(descHeight, 14) + 12;
    }

    doc
      .strokeColor(line)
      .moveTo(50, rowY)
      .lineTo(545, rowY)
      .stroke();

    rowY += 16;
    const totalsX = 370;

    const drawTotalRow = (label: string, value: string, bold = false) => {
      doc
        .fillColor(muted)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .text(label, totalsX, rowY, { width: 70 });
      doc
        .fillColor(ink)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(value, 450, rowY, { width: 95, align: "right" });
      rowY += 18;
    };

    drawTotalRow("Subtotal", formatMoney(invoice.subtotal, invoice.currency));
    drawTotalRow(
      `Tax (${invoice.taxRate}%)`,
      formatMoney(invoice.taxAmount, invoice.currency)
    );
    drawTotalRow("Total", formatMoney(invoice.total, invoice.currency), true);

    if (invoice.notes) {
      rowY += 20;
      doc.fillColor(muted).fontSize(9).font("Helvetica-Bold").text("NOTES", 50, rowY);
      doc
        .fillColor(ink)
        .font("Helvetica")
        .fontSize(10)
        .text(invoice.notes, 50, rowY + 14, { width: 495 });
    }

    doc
      .fillColor(muted)
      .fontSize(8)
      .text("Generated by WaveGuid Invoices", 50, 780, {
        align: "center",
        width: 495,
      });

    doc.end();
  });
}
