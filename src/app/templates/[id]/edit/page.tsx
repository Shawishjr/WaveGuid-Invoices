import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseElements } from "@/lib/templates";
import TemplateEditor from "@/components/TemplateEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params;

  const [template, company] = await Promise.all([
    prisma.invoiceTemplate.findUnique({ where: { id } }),
    prisma.companySettings.findFirst(),
  ]);

  if (!template) notFound();

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Edit template
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Changes only affect new PDF exports — saved invoices keep their data.
        </p>
      </section>
      <TemplateEditor
        templateId={template.id}
        initialName={template.name}
        initialElements={parseElements(template.elements)}
        defaultTemplateId={company?.defaultTemplateId}
      />
    </>
  );
}
