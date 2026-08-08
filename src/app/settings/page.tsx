export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Settings
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          User preferences and account controls will appear here as the user database is added.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Coming soon</h3>
        </div>
        <div className="empty">Profile management, permissions, and team settings will be available soon.</div>
      </section>
    </>
  );
}
