# WaveGuid Invoices

Web app for creating, managing, and exporting professional invoices as PDF.

## Stack

- **Next.js 15** (App Router) — UI + API
- **Prisma** + **SQLite** — database
- **PDFKit** — PDF generation
- **TypeScript** + **Zod** — typing and validation

## Features

- Dashboard with outstanding / collected totals
- Create, edit, delete invoices
- Client management
- Line items with tax calculation
- Status tracking (`draft`, `sent`, `paid`, `overdue`, `cancelled`)
- One-click PDF export

## Getting started

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema to SQLite |
| `npm run db:seed` | Seed demo company, clients, invoices |

## Environment

Copy `.env.example` to `.env`:

```
DATABASE_URL="file:./dev.db"
```
