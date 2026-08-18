import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceActions } from "@/components/InvoiceActions";
import { PaymentManager } from "@/components/PaymentManager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true, payments: true },
    }),
    prisma.companySettings.findFirst(),
  ]);

  if (!invoice) notFound();

  const payments = [...invoice.payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const amountDue = Math.max(
    0,
    Math.round((invoice.total - invoice.paidAmount) * 100) / 100
  );

  return (
    <>
      <div className="detail-layout">
      <article className="invoice-sheet">
        <header>
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--muted)" }}>
              {company?.name || "WaveGuid"}
            </p>
            <h2>{invoice.number}</h2>
            {invoice.subject && (
              <p style={{ margin: "4px 0 0", color: "var(--ink)", fontWeight: 600 }}>
                {invoice.subject}
              </p>
            )}
          </div>
          <StatusBadge status={invoice.status} />
        </header>

        <div className="form-grid" style={{ marginBottom: 28 }}>
          <div className="meta-block">
            <h4>From</h4>
            <p>
              {company?.name || "WaveGuid"}
              {company?.address ? `\n${company.address}` : ""}
              {company?.email ? `\n${company.email}` : ""}
            </p>
          </div>
          <div className="meta-block">
            <h4>Bill to</h4>
            <p>
              {invoice.client.company || invoice.client.name}
              {invoice.client.company ? `\n${invoice.client.name}` : ""}
              {invoice.client.address ? `\n${invoice.client.address}` : ""}
              {invoice.client.email ? `\n${invoice.client.email}` : ""}
            </p>
          </div>
          <div className="meta-block">
            <h4>Issue date</h4>
            <p>{formatDate(invoice.issueDate)}</p>
          </div>
          <div className="meta-block">
            <h4>Due date</h4>
            <p>{formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: "normal" }}>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unitPrice, invoice.currency)}</td>
                  <td>{formatMoney(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals" style={{ marginTop: 20 }}>
          <div>
            <span>Subtotal</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.vatAmount > 0 && (
            <div>
              <span>VAT (17%)</span>
              <span>{formatMoney(invoice.vatAmount, invoice.currency)}</span>
            </div>
          )}
          <div className="grand">
            <span>Total</span>
            <span>{formatMoney(invoice.total, invoice.currency)}</span>
          </div>
          {invoice.paidAmount > 0 && (
            <div>
              <span>Paid</span>
              <span>-{formatMoney(invoice.paidAmount, invoice.currency)}</span>
            </div>
          )}
          {invoice.paidAmount > 0 && (
            <div className="grand">
              <span>Amount due</span>
              <span>{formatMoney(amountDue, invoice.currency)}</span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <div className="meta-block" style={{ marginTop: 28 }}>
            <h4>Notes</h4>
            <p>{invoice.notes}</p>
          </div>
        )}
      </article>

      <aside className="side-card">
        <h3 style={{ margin: 0 }}>Actions</h3>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
          Download a print-ready PDF or update this invoice.
        </p>
        <InvoiceActions id={invoice.id} />
      </aside>
      </div>

      <PaymentManager
        invoiceId={invoice.id}
        invoiceStatus={invoice.status}
        currency={invoice.currency}
        total={invoice.total}
        paidAmount={invoice.paidAmount}
        payments={payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.date.toISOString(),
          method: p.method,
          note: p.note,
          proofMime: p.proofMime,
          proofName: p.proofName,
        }))}
      />
    </>
  );
}
