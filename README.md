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

> ### ⚠️ Important: Path with `#` character
> This project is located under `E:\#Project\...`. The `#` character in the
> directory path **breaks Next.js's React Server Components module resolution**
> (the `#` is used as a delimiter in the React Client Manifest, causing errors
> like `Could not find the module "...global-error.js#" in the React Client
> Manifest`).
>
> **Use the provided batch scripts** instead of `npm run dev` / `npm run build`
> directly. They map the project to a virtual drive (`W:`) without the `#`
> character and run from there:
>
> | Command | Description |
> | --- | --- |
> | `dev.bat` | Start development server (via `W:` virtual drive) |
> | `build.bat` | Production build (via `W:` virtual drive) |
>
> Alternatively, run manually:
>
> ```bat
> subst W: "E:\#Project\WAVE\WaveGuid-Invoices"
> W:
> npm run dev
> subst W: /D
> ```

## Scripts

| Command | Description |
| --- | --- |
| `dev.bat` | Start development server (recommended — handles `#` path issue) |
| `build.bat` | Production build (recommended — handles `#` path issue) |
| `npm run dev` | Start development server (only works from a path without `#`) |
| `npm run build` | Production build (only works from a path without `#`) |
| `npm run db:push` | Sync Prisma schema to SQLite |
| `npm run db:seed` | Seed demo company, clients, invoices |

## Environment

Copy `.env.example` to `.env`:

```
DATABASE_URL="file:./dev.db"
```
