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
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

module.exports = nextConfig;
