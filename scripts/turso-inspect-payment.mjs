import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  const res = await client.execute(
    "SELECT sql FROM sqlite_master WHERE name = 'Payment'"
  );
  console.log(res.rows[0].sql);
}
main();
