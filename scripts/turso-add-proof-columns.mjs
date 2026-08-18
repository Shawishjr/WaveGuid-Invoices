import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  const columns = ["proofData TEXT", "proofMime TEXT", "proofName TEXT"];
  for (const col of columns) {
    const name = col.split(" ")[0];
    try {
      await client.execute(`ALTER TABLE "Payment" ADD COLUMN "${col}"`);
      console.log(`added column: ${name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`${name}: ${/duplicate column/i.test(msg) ? "already exists" : msg}`);
    }
  }
}
main();
