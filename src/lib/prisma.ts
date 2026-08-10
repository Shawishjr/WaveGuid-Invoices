import { PrismaClient, Prisma } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isTurso = databaseUrl.startsWith("libsql:");

function createPrismaClient(): PrismaClient {
  const log = (
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  ) as ("error" | "warn")[];

  if (isTurso) {
    // Lazy-import so local dev (file: DB) doesn't need the adapter packages.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require("@libsql/client");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaLibSQL } = require("@prisma/adapter-libsql");

    const libsql = createClient({
      url: databaseUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log } as never);
  }

  return new PrismaClient({ log });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache on globalThis so serverless warm invocations reuse the connection
// instead of opening a new one on every request.
globalForPrisma.prisma = prisma;
