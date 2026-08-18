import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createClient } = require("@libsql/client");
const bcrypt = require("bcryptjs");

async function main() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const { randomUUID } = await import("crypto");

  const users = [
    {
      email: "admin@waveguid.com",
      name: "Hassan Tariq",
      password: "password123",
      role: "SUPER_ADMIN",
    },
    {
      email: "shawish@waveguid.com",
      name: "Shawish",
      password: "admin123",
      role: "SUPER_ADMIN",
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await client.execute({
      sql: `INSERT INTO "User" ("id","email","name","password","role","createdAt","updatedAt")
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      args: [randomUUID(), u.email, u.name, hash, u.role],
    });
    console.log(`created user: ${u.email} (${u.role})`);
  }

  const rows = await client.execute('SELECT email, role FROM "User"');
  console.log("Users in remote DB:", JSON.stringify(rows.rows));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
