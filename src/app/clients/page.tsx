import { prisma } from "@/lib/prisma";
import { ClientManager } from "@/components/ClientManager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      invoices: {
        orderBy: { issueDate: "desc" },
        select: { id: true, number: true, issueDate: true, status: true, total: true, currency: true },
      },
    },
  });

  return <ClientManager clients={clients} />;
}
