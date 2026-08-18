import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  try {
    await client.execute(`CREATE TABLE "CurrencyRate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "usdToSdg" REAL NOT NULL DEFAULT 601,
      "updatedAt" DATETIME NOT NULL
    )`);
    console.log("created table CurrencyRate");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(/already exists/i.test(msg) ? "CurrencyRate already exists" : msg);
  }
}
main();
