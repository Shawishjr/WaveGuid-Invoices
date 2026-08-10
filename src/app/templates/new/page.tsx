import { defaultElements } from "@/lib/templates";
import TemplateEditor from "@/components/TemplateEditor";

export const dynamic = "force-dynamic";

export default function NewTemplatePage() {
  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          New PDF template
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Position elements on the page, then save. Use placeholders like {"{{invoice.number}}"} to inject data.
        </p>
      </section>
      <TemplateEditor
        isNew
        initialName="Untitled template"
        initialElements={defaultElements()}
      />
    </>
  );
}
