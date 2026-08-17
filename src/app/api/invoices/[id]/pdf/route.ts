import { NextResponse } from "next/server";
import { getInvoicePdfById } from "@/lib/invoice-pdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const result = await getInvoicePdfById(id);

  if (!result) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.number}.pdf"`,
    },
  });
}
