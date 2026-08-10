import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { templateSchema, serializeElements } from "@/lib/templates";

export async function GET() {
  const templates = await prisma.invoiceTemplate.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { invoices: true } } },
  });
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = templateSchema.safeParse({
      name: body.name,
      elements: body.elements ?? [],
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await prisma.invoiceTemplate.create({
      data: {
        name: parsed.data.name,
        elements: serializeElements(parsed.data.elements),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
