import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseElements } from "@/lib/templates";
import { TemplateCard } from "@/components/TemplateCard";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  name: string;
  elements: string;
  _count: { invoices: number };
};

export default async function TemplatesPage() {
  const [templates, company] = await Promise.all([
    prisma.invoiceTemplate.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { invoices: true } } },
    }),
    prisma.companySettings.findFirst(),
  ]);

  const defaultId = company?.defaultTemplateId;

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
              PDF templates
            </h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Build reusable invoice layouts. Add text, shapes, the items table, and totals — then pick a template per invoice.
            </p>
          </div>
          <Link className="btn btn-primary" href="/templates/new">New template</Link>
        </div>
      </section>

      {templates.length === 0 ? (
        <section className="panel">
          <div className="empty">
            No templates yet. <Link href="/templates/new">Create your first template</Link>.
          </div>
        </section>
      ) : (
        <div className="template-grid">
          {templates.map((t: TemplateRow) => (
            <TemplateCard
              key={t.id}
              id={t.id}
              name={t.name}
              elementCount={parseElements(t.elements).length}
              invoiceCount={t._count.invoices}
              isDefault={defaultId === t.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
