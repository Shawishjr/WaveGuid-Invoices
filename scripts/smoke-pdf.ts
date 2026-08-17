import { getInvoicePdfById } from "../src/lib/invoice-pdf";
import { prisma } from "../src/lib/prisma";

async function main() {
  const inv = await prisma.invoice.findFirst();
  if (!inv) {
    console.log("no invoices in db, skipping");
    return;
  }
  const r = await getInvoicePdfById(inv.id);
  if (r) {
    console.log(`PDF OK: invoice ${r.number}, ${r.pdf.length} bytes`);
  } else {
    console.log("PDF FAILED: null");
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("PDF SMOKE FAILED:", e);
  process.exit(1);
});
