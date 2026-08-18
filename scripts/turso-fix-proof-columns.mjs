import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  const renames = [
    ['"proofData TEXT"', '"proofData"'],
    ['"proofMime TEXT"', '"proofMime"'],
    ['"proofName TEXT"', '"proofName"'],
  ];

  for (const [from, to] of renames) {
    try {
      await client.execute(
        `ALTER TABLE "Payment" RENAME COLUMN ${from} TO ${to}`
      );
      console.log(`renamed ${from} -> ${to}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/no such column|duplicate column/i.test(msg)) {
        console.log(`${to}: ${msg}`);
        continue;
      }
      throw e;
    }
  }

  const res = await client.execute(
    "SELECT sql FROM sqlite_master WHERE name = 'Payment'"
  );
  console.log("\nFinal schema:");
  console.log(res.rows[0].sql);
}
main();
