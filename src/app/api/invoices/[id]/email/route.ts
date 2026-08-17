import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendInvoiceEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured (set SMTP_HOST, SMTP_USER and SMTP_PASS)" },
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

  let to = invoice.client.email || "";
  try {
    const body = await request.json();
    if (body?.email) to = String(body.email);
  } catch {
    // empty body is fine
  }

  if (!to) {
    return NextResponse.json(
      { error: 'Client has no email address (you can pass { "email": "a@b.com" } in the body)' },
      { status: 400 }
    );
  }

  const result = await sendInvoiceEmail(id, to);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
