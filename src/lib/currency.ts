import { prisma } from "@/lib/prisma";

export async function getOrCreateRate() {
  let rate = await prisma.currencyRate.findFirst();
  if (!rate) {
    rate = await prisma.currencyRate.create({ data: {} });
  }
  return rate;
}
