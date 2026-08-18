import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * Serves a payment's receipt/transfer proof inline (preview in browser,
 * no download disposition). Auth-protected by middleware.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { proofData: true, proofMime: true },
  });

  if (!payment?.proofData || !payment.proofMime) {
    return NextResponse.json({ error: "No proof attached" }, { status: 404 });
  }

  const base64 = payment.proofData;
  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": payment.proofMime,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
