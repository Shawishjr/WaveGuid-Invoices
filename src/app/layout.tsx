import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaveGuid Invoices",
  description: "Create, manage, and export professional invoices as PDF.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden />
              <h1>WaveGuid</h1>
              <span>Invoices</span>
            </Link>
            <nav className="nav-actions">
              <Link className="btn btn-ghost" href="/clients">
                Clients
              </Link>
              <Link className="btn btn-secondary" href="/invoices">
                All invoices
              </Link>
              <Link className="btn btn-primary" href="/invoices/new">
                New invoice
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
