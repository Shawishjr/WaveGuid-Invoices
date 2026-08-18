import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");

const __dirname = dirname(fileURLToPath(import.meta.url));
const template = JSON.parse(
  readFileSync(join(__dirname, "..", "prisma", "main-template.json"), "utf8")
);

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const { randomUUID } = await import("crypto");

  const existing = await client.execute({
    sql: 'SELECT "id" FROM "InvoiceTemplate" WHERE "name" = ?',
    args: [template.name],
  });

  const elementsJson = JSON.stringify(template.elements);

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await client.execute({
      sql: `UPDATE "InvoiceTemplate" SET "elements" = ?, "updatedAt" = datetime('now') WHERE "id" = ?`,
      args: [elementsJson, id],
    });
    console.log(`updated template: ${template.name} (${id})`);
  } else {
    const id = randomUUID();
    await client.execute({
      sql: `INSERT INTO "InvoiceTemplate" ("id","name","elements","createdAt","updatedAt")
            VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      args: [id, template.name, elementsJson],
    });
    console.log(`created template: ${template.name} (${id})`);
  }

  const rows = await client.execute('SELECT "name" FROM "InvoiceTemplate"');
  console.log(
    "Templates in remote DB:",
    JSON.stringify(rows.rows.map((r) => r.name))
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
