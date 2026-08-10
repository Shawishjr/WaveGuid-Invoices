import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../components/AppShell";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "WaveGuid Invoices",
  description: "Create, manage, and export professional invoices as PDF.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <AppShell userName={session?.name}>{children}</AppShell>
      </body>
    </html>
  );
}
