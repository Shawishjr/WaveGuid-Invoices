import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isTurso = databaseUrl.startsWith("libsql:");

function createPrismaClient(): PrismaClient {
  const log = (
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  ) as Prisma.LogLevel[];

  if (isTurso) {
    const adapter = new PrismaLibSQL({
      url: databaseUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter, log });
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
