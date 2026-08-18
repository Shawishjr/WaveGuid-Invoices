import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getOrCreateRate } from "@/lib/currency";

export async function GET() {
  try {
    const rate = await getOrCreateRate();
    return NextResponse.json({
      usdToSdg: rate.usdToSdg,
      updatedAt: rate.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load currency rate" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const usdToSdg = Number(body?.usdToSdg);
    if (!Number.isFinite(usdToSdg) || usdToSdg <= 0) {
      return NextResponse.json(
        { error: "Rate must be a positive number" },
        { status: 400 }
      );
    }

    const current = await getOrCreateRate();
    const rate = await prisma.currencyRate.update({
      where: { id: current.id },
      data: { usdToSdg },
    });

    return NextResponse.json({
      usdToSdg: rate.usdToSdg,
      updatedAt: rate.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update currency rate" },
      { status: 500 }
    );
  }
}
