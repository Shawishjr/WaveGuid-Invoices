import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      proofMime: true,
      proofName: true,
      invoice: {
        select: {
          id: true,
          number: true,
          currency: true,
          client: { select: { name: true, company: true } },
        },
      },
    },
  });
  return NextResponse.json(payments);
}
