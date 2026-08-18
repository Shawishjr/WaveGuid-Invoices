import { prisma } from "@/lib/prisma";
import { ClientManager } from "@/components/ClientManager";

export const dynamic = "force-dynamic";

const OUTSTANDING_STATUSES = ["partly_paid"];

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      invoices: {
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          number: true,
          issueDate: true,
          dueDate: true,
          status: true,
          total: true,
          paidAmount: true,
          currency: true,
        },
      },
    },
  });

  const enriched = clients.map((client) => {
    const outstanding = client.invoices.filter((inv) =>
      OUTSTANDING_STATUSES.includes(inv.status)
    );
    const owed = outstanding.reduce(
      (sum, inv) => sum + Math.max(0, inv.total - inv.paidAmount),
      0
    );
    const owedCurrency = outstanding[0]?.currency ?? client.invoices[0]?.currency ?? "USD";

    return {
      ...client,
      invoiceCount: client.invoices.length,
      owed,
      owedCurrency,
    };
  });

  return <ClientManager clients={enriched} />;
}
