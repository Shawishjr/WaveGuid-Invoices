import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

/**
 * One-off: set up the two SUPER_ADMIN accounts without wiping
 * existing invoices / clients / templates.
 *
 *   - Hassan Tariq  (admin@waveguid.com)   -> SUPER_ADMIN
 *   - Shawish       (shawish@waveguid.com) -> SUPER_ADMIN (created if missing)
 *
 * Run with:  npx tsx scripts/setup-users.ts
 */
async function main() {
  const adminEmail = "admin@waveguid.com";
  const shawishEmail = "shawish@waveguid.com";

  const existing = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });
  console.log("Current users:");
  existing.forEach((u) => console.log(`  - ${u.email} | ${u.name} | ${u.role}`));

  // Promote / create Hassan Tariq
  const hassan = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (hassan) {
    await prisma.user.update({
      where: { id: hassan.id },
      data: { name: "Hassan Tariq", role: "SUPER_ADMIN" },
    });
    console.log(`Updated ${adminEmail} -> SUPER_ADMIN`);
  } else {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Hassan Tariq",
        password: await bcrypt.hash("password123", 10),
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Created ${adminEmail} -> SUPER_ADMIN`);
  }

  // Create Shawish if missing
  const shawish = await prisma.user.findUnique({ where: { email: shawishEmail } });
  if (shawish) {
    await prisma.user.update({
      where: { id: shawish.id },
      data: { role: "SUPER_ADMIN" },
    });
    console.log(`Updated ${shawishEmail} -> SUPER_ADMIN`);
  } else {
    await prisma.user.create({
      data: {
        email: shawishEmail,
        name: "Shawish",
        password: await bcrypt.hash("admin123", 10),
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Created ${shawishEmail} -> SUPER_ADMIN`);
  }

  const after = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
    orderBy: { email: "asc" },
  });
  console.log("Users after setup:");
  after.forEach((u) => console.log(`  - ${u.email} | ${u.name} | ${u.role}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
