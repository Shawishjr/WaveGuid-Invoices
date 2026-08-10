import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Template id is required" }, { status: 400 });
    }

    const template = await prisma.invoiceTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    let company = await prisma.companySettings.findFirst();
    if (!company) {
      company = await prisma.companySettings.create({ data: { name: "WaveGuid", defaultTemplateId: id } });
    } else {
      company = await prisma.companySettings.update({
        where: { id: company.id },
        data: { defaultTemplateId: id },
      });
    }
    return NextResponse.json({ ok: true, defaultTemplateId: id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to set default template" }, { status: 500 });
  }
}
