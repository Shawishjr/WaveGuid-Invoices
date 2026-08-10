/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "pdfkit",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
  ],
};

module.exports = nextConfig;
