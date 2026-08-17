import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWhatsappConfigured, sendInvoicePdf } from "@/lib/whatsapp";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!isWhatsappConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp is not configured (set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID)" },
      { status: 400 }
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let phone = invoice.client.phone || "";
  try {
    const body = await request.json();
    if (body?.phone) phone = String(body.phone);
  } catch {
    // empty body is fine
  }

  if (!phone) {
    return NextResponse.json(
      { error: "Client has no phone number (you can pass { \"phone\": \"+123...\" } in the body)" },
      { status: 400 }
    );
  }

  const result = await sendInvoicePdf(id, phone);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
