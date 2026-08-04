import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.companySettings.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();

  await prisma.companySettings.create({
    data: {
      name: "WaveGuid",
      email: "billing@waveguid.com",
      phone: "+1 (555) 010-2000",
      address: "120 Harbor Avenue, Suite 400\nSan Francisco, CA 94105",
      website: "https://waveguid.com",
    },
  });

  const acme = await prisma.client.create({
    data: {
      name: "Jordan Lee",
      company: "Acme Studios",
      email: "jordan@acmestudios.com",
      phone: "+1 (555) 221-8844",
      address: "88 Market Street\nNew York, NY 10013",
    },
  });

  const northwind = await prisma.client.create({
    data: {
      name: "Sam Rivera",
      company: "Northwind Labs",
      email: "sam@northwindlabs.io",
      phone: "+1 (555) 772-0199",
      address: "14 Innovation Drive\nAustin, TX 78701",
    },
  });

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  await prisma.invoice.create({
    data: {
      number: "INV-1001",
      status: "sent",
      issueDate,
      dueDate,
      currency: "USD",
      taxRate: 8.5,
      notes: "Payment due within 30 days. Thank you for your business.",
      clientId: acme.id,
      items: {
        create: [
          {
            description: "Brand identity package",
            quantity: 1,
            unitPrice: 2400,
            amount: 2400,
          },
          {
            description: "Website design (landing + 4 pages)",
            quantity: 1,
            unitPrice: 3800,
            amount: 3800,
          },
          {
            description: "Design system documentation",
            quantity: 8,
            unitPrice: 95,
            amount: 760,
          },
        ],
      },
      subtotal: 6960,
      taxAmount: 591.6,
      total: 7551.6,
    },
  });

  const paidDue = new Date();
  paidDue.setDate(paidDue.getDate() - 5);

  await prisma.invoice.create({
    data: {
      number: "INV-1002",
      status: "paid",
      issueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      dueDate: paidDue,
      currency: "USD",
      taxRate: 0,
      notes: "Retainer — March",
      clientId: northwind.id,
      items: {
        create: [
          {
            description: "Monthly product design retainer",
            quantity: 1,
            unitPrice: 4500,
            amount: 4500,
          },
        ],
      },
      subtotal: 4500,
      taxAmount: 0,
      total: 4500,
    },
  });

  await prisma.invoice.create({
    data: {
      number: "INV-1003",
      status: "draft",
      issueDate,
      dueDate,
      currency: "USD",
      taxRate: 8.5,
      clientId: acme.id,
      items: {
        create: [
          {
            description: "Motion design — product launch reel",
            quantity: 1,
            unitPrice: 1800,
            amount: 1800,
          },
        ],
      },
      subtotal: 1800,
      taxAmount: 153,
      total: 1953,
    },
  });

  console.log("Seeded WaveGuid Invoices demo data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
