import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrCreateRate } from "@/lib/currency";
import { CurrencyRateForm } from "@/components/CurrencyRateForm";

export const dynamic = "force-dynamic";

export default async function CurrencyRatePage() {
  const session = await getSession();
  if (!session) notFound();

  const rate = await getOrCreateRate();

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "2.4rem",
            margin: "0 0 8px",
          }}
        >
          Currency rate
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Set the exchange rate used to convert between USD and SDG.
        </p>
      </section>

      <CurrencyRateForm initialRate={rate.usdToSdg} updatedAt={rate.updatedAt.toISOString()} />
    </>
  );
}
