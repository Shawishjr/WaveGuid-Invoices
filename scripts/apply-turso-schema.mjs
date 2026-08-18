import { readFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, "turso-schema.sql"), "utf8");
  // strip BOM if present
  const clean = sql.replace(/^\uFEFF/, "");
  const statements = clean
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  const client = createClient({ url, authToken });

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
    } catch (e) {
      // "already exists" errors are fine for idempotent re-runs
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(msg)) {
        console.log(`skip (exists): ${stmt.slice(0, 60)}...`);
        continue;
      }
      console.error(`FAILED: ${stmt.slice(0, 80)}`);
      console.error(msg);
      process.exit(1);
    }
  }

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("Tables now in remote DB:", tables.rows.map((r) => r.name).join(", "));
}

main();
