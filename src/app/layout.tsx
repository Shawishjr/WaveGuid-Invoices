import type { Metadata } from "next";
import "./globals.css";
import AppShell from "../components/AppShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, image: true },
      })
    : null;

  return (
    <html lang="en">
      <body>
        <AppShell userName={user?.name} userImage={user?.image}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
