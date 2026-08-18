import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * One-off migration: narrow invoice statuses to draft / partly_paid / fully_paid.
 *
 * Mapping:
 *   paid                                        -> fully_paid
 *   sent | overdue with paidAmount > 0           -> partly_paid
 *   sent | overdue | cancelled with no payments  -> draft
 *
 * Runs against the local SQLite DB (via Prisma) and, when Turso env vars
 * are present, against the remote preview DB as well.
 */

const SQL_UPDATES = [
  [`UPDATE "Invoice" SET "status"='fully_paid' WHERE "status"='paid'`, "paid -> fully_paid"],
  [
    `UPDATE "Invoice" SET "status"='partly_paid' WHERE "status" IN ('sent','overdue') AND "paidAmount" > 0`,
    "sent/overdue (with payments) -> partly_paid",
  ],
  [
    `UPDATE "Invoice" SET "status"='draft' WHERE "status" IN ('sent','overdue','cancelled')`,
    "sent/overdue/cancelled (unpaid) -> draft",
  ],
];

const SQL_COUNTS = `SELECT "status", COUNT(*) as n FROM "Invoice" GROUP BY "status"`;

async function migrateTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.log("[turso] skipped (no TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)");
    return;
  }
  const { createClient } = require("@libsql/client");
  const client = createClient({ url, authToken });
  for (const [sql, label] of SQL_UPDATES) {
    const res = await client.execute(sql);
    console.log(`[turso] ${label} (rows: ${res.rowsAffected})`);
  }
  const counts = await client.execute(SQL_COUNTS);
  console.log("[turso] statuses now:", JSON.stringify(counts.rows));
}

async function migrateLocal() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    for (const [label, fn] of [
      ["paid -> fully_paid", () => prisma.invoice.updateMany({ where: { status: "paid" }, data: { status: "fully_paid" } })],
      [
        "sent/overdue (with payments) -> partly_paid",
        () =>
          prisma.invoice.updateMany({
            where: { status: { in: ["sent", "overdue"] }, paidAmount: { gt: 0 } },
            data: { status: "partly_paid" },
          }),
      ],
      [
        "sent/overdue/cancelled (unpaid) -> draft",
        () =>
          prisma.invoice.updateMany({
            where: { status: { in: ["sent", "overdue", "cancelled"] } },
            data: { status: "draft" },
          }),
      ],
    ]) {
      const res = await fn();
      console.log(`[local] ${label} (rows: ${res.count})`);
    }
    const grouped = await prisma.invoice.groupBy({ by: ["status"], _count: { status: true } });
    console.log(
      "[local] statuses now:",
      JSON.stringify(grouped.map((g) => ({ status: g.status, n: g._count.status })))
    );
  } finally {
    await prisma.$disconnect();
  }
}

const target = process.argv[2];

if (target === "turso") {
  await migrateTurso();
} else if (target === "local") {
  await migrateLocal();
} else {
  await migrateLocal();
  await migrateTurso();
}
