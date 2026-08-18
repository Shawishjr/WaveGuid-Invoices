/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "pdfkit",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
};

module.exports = nextConfig;
