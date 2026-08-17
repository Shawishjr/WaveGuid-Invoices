# WaveGuid Invoices

A full-stack invoicing web application: create and manage invoices, track payments and outstanding balances, manage clients, design PDF templates, and deliver invoices automatically to clients via **email** and **WhatsApp**.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-start)
- [Development on Windows (`#` Path Issue)](#development-on-windows--path-issue)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Invoice Delivery Channels](#invoice-delivery-channels)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Default Login](#default-login)
- [Deployment](#deployment)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 15** (App Router, React 19, Server Components) |
| Language | **TypeScript** (strict) |
| Database | **Prisma ORM** with **SQLite** (local) / **Turso libSQL** (production) |
| Validation | **Zod** |
| PDF generation | **puppeteer-core** (local Chrome/Edge) + **@sparticuz/chromium** (serverless) |
| Auth | **jose** (JWT sessions), **bcryptjs** (password hashing) |
| Email delivery | **nodemailer** (any SMTP provider) |
| WhatsApp delivery | **Meta WhatsApp Cloud API** |

## Features

- **Dashboard** — outstanding vs. collected totals, invoice status overview
- **Invoices** — full CRUD, line items, VAT (17%) toggle, currency (USD/SDG), status workflow (`draft` → `sent` → `paid` / `overdue` / `cancelled`), payment tracking
- **Clients** — contact management (email, phone, address, company), outstanding balance per client
- **Automatic delivery** — on invoice creation, the PDF is emailed and/or sent via WhatsApp to the client (each channel is optional and independently configured)
- **Manual resend** — per-invoice resend endpoints for email and WhatsApp
- **PDF templates** — drag-and-drop template designer with placeholder tokens, per-invoice template selection
- **Reports** — revenue and payment reporting
- **Authentication** — JWT login with role-based access (`SUPER_ADMIN`, `USER`), user management

## Getting Started

### Prerequisites

- **Node.js 18.18+** (global `fetch`, `FormData`, `Blob` are required)
- npm
- A Chromium-based browser for PDF generation: **Chrome** or **Edge** (Windows), or the bundled `@sparticuz/chromium` (serverless/Linux)

### Setup

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure environment
cp .env.example .env        # Windows: copy .env.example .env
#    -> set JWT_SECRET to a long random string

# 3. Initialize the database
npm run db:push             # create SQLite schema
npm run db:seed             # demo users, clients, invoices

# 4. Start the dev server
npm run dev                 # or dev.bat / preview.bat on Windows (see below)
```

Open [http://localhost:3000](http://localhost:3000) and log in (see [Default Login](#default-login)).

### PDF generation notes

PDFs are rendered with `puppeteer-core`, which requires a browser executable:

- **Windows**: the app auto-detects Chrome/Edge at standard locations. Override with `CHROME_PATH` in `.env` if needed.
- **Vercel / serverless**: `@sparticuz/chromium` provides the binary automatically (used when `process.platform !== "win32"`).

## Development on Windows (`#` Path Issue)

If the project lives under a path containing a `#` character (e.g. `E:\#Project\...`), Next.js React Server Components break (`#` is a delimiter in the React Client Manifest). The provided batch scripts map the project to a virtual `W:` drive (no `#`) and run from there:

| Script | Description |
| --- | --- |
| `dev.bat [port]` | Dev server on `W:` (default port 3000) |
| `preview.bat [port]` | Same, but streams all output to `preview.log` (default port 3000) |

If your path contains no `#`, plain `npm run dev` works. Manual equivalent:

```bat
subst W: "<project path>"
W:
npm run dev
subst W: /D
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (requires config; not set up yet) |
| `npx tsc --noEmit` | Type check (recommended before committing) |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed demo users, clients, invoices |
| `npm run db:generate` | Regenerate Prisma Client |

> If `prisma db push` reports `EPERM ... query_engine-windows.dll.node`, a running dev server is locking the DLL. Stop the server, re-run the command, restart.

## Environment Variables

Copy `.env.example` to `.env`. Required:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `file:./dev.db` locally, `libsql://...` on Turso |
| `JWT_SECRET` | Yes | Long random string for signing session JWTs |
| `TURSO_AUTH_TOKEN` | Prod only | Turso DB token (when `DATABASE_URL` starts with `libsql://`) |

Optional — invoice delivery and PDF:

| Variable | Description |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Email delivery (see below) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE`, `WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_API_VERSION` | WhatsApp delivery (see below) |
| `CHROME_PATH` | Custom browser executable for PDF rendering (Windows) |

## Invoice Delivery Channels

Delivery is **automatic on invoice creation** for every channel that is (a) configured and (b) has the client's contact info. The create-invoice API response reports the outcome per channel:

```json
{
  "delivery": {
    "email":    { "sent": true },
    "whatsapp": { "sent": false, "error": "WhatsApp not configured" }
  }
}
```

Failures never block invoice creation — they are reported in the response and logged with an `[email]` / `[whatsapp]` prefix. Each invoice records `emailSentAt` / `whatsappSentAt` timestamps.

The email and phone can be set directly on the invoice form (they sync to the client record), or managed from the Clients page.

### Email (SMTP)

Works with any SMTP provider — examples:

| Provider | Host | Port / Secure |
| --- | --- | --- |
| Gmail (App Password required) | `smtp.gmail.com` | `465` / `true` |
| Brevo (free 300/day) | `smtp-relay.brevo.com` | `587` / `false` |
| Outlook / 365 | `smtp.office365.com` | `587` / `false` |
| Resend | `smtp.resend.com` | `465` / `true` |

```
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="billing@yourcompany.com"
```

No provider approval process — set the variables and the next invoice created is emailed with the PDF attached.

### WhatsApp (Meta Cloud API)

One-time Meta setup (~30 min, free tier ≈ 1,000 conversations/month):

1. Create a **Meta Business Account** ([business.facebook.com](https://business.facebook.com))
2. Create a Business-type app at [developers.facebook.com](https://developers.facebook.com) and add the **WhatsApp** product; register a WhatsApp Business number
3. Copy the **Phone Number ID** (WhatsApp → API Setup) → `WHATSAPP_PHONE_NUMBER_ID`
4. Create a **System User** token with `whatsapp_business_messaging` permission → `WHATSAPP_TOKEN`
5. Create and submit a message template named `invoice_send` (WhatsApp Manager → Message Templates):
   - **Header:** Document
   - **Body:** 3 variables, e.g. `Your invoice {{1}} for {{2}} is attached. Due date: {{3}}.`
   - **Category:** Utility

Business-initiated messages **fail until Meta approves the template** (minutes to 48 h). For testing, Meta provides 5 free pre-approved templates and unlimited messaging to up to 5 registered test numbers.

```
WHATSAPP_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="123456789"
WHATSAPP_TEMPLATE="invoice_send"
WHATSAPP_TEMPLATE_LANG="en"
WHATSAPP_API_VERSION="v21.0"
```

Client phone numbers should be in international format (e.g. `+249 91…`); non-digit characters are stripped automatically.

## API Reference

All endpoints under `/api`. Auth-protected unless noted.

### Auth
| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login, sets JWT cookie |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current session user |

### Invoices
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/invoices` | List invoices (client + items included) |
| `POST` | `/api/invoices` | Create invoice — **triggers automatic delivery**; body accepts `clientId` or `clientName` + optional `clientEmail` / `clientPhone` |
| `GET` | `/api/invoices/{id}` | Get invoice |
| `PUT` | `/api/invoices/{id}` | Update invoice |
| `DELETE` | `/api/invoices/{id}` | Delete invoice |
| `GET` | `/api/invoices/{id}/pdf` | Download PDF |
| `POST` | `/api/invoices/{id}/email` | Resend via email (optional body `{ "email": "x@y.com" }`) |
| `POST` | `/api/invoices/{id}/whatsapp` | Resend via WhatsApp (optional body `{ "phone": "+249…" }`) |
| `GET`/`POST` | `/api/invoices/{id}/payments` | List / record payments |

### Clients
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`/`POST` | `/api/clients` | List / create clients |
| `GET`/`PUT`/`DELETE` | `/api/clients/{id}` | Read / update / delete a client |

### Users (SUPER_ADMIN only)
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`/`POST` | `/api/users` | List / create users |
| `PUT`/`DELETE` | `/api/users/{id}` | Update / delete a user |

### Templates & Payments
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`/`POST` | `/api/templates` | List / create PDF templates |
| `GET`/`PUT`/`DELETE` | `/api/templates/{id}` | Read / update / delete a template |
| `GET` | `/api/templates/{id}/preview` | PNG preview of a template |
| `GET`/`POST` | `/api/templates/default` | Get / set the default template |
| `DELETE` | `/api/payments/{id}` | Delete a payment record |

## Project Structure

```
src/
├── app/
│   ├── api/                  # Route handlers (auth, clients, invoices, payments, templates, users)
│   ├── clients/              # Client management page
│   ├── dashboard/            # Dashboard page
│   ├── invoices/             # Invoice list / new / detail / edit pages
│   ├── login/                # Login page
│   ├── reports/              # Reports page
│   ├── search/               # Global search
│   ├── settings/             # Company settings, user management
│   └── templates/            # PDF template designer
├── components/               # React components (InvoiceForm, ClientManager, …)
└── lib/
    ├── auth.ts               # Password hashing / verification
    ├── session.ts            # JWT session helpers
    ├── prisma.ts             # Prisma client singleton (SQLite / Turso)
    ├── invoices.ts           # Zod schemas, totals/VAT math, invoice numbering
    ├── invoice-pdf.ts        # Loads an invoice and builds its PDF
    ├── pdf.ts                # HTML → PDF rendering (puppeteer-core)
    ├── templates.ts          # Template elements, tokens, defaults
    ├── email.ts              # SMTP delivery (nodemailer)
    └── whatsapp.ts           # WhatsApp Cloud API delivery
prisma/
├── schema.prisma             # Client, Invoice, InvoiceItem, Payment, User, …
└── seed.ts                   # Demo data
```

## Default Login

After `npm run db:seed`:

| Email | Password | Role |
| --- | --- | --- |
| `admin@waveguid.com` | `password123` | SUPER_ADMIN |
| `shawish@waveguid.com` | `admin123` | USER |

> Change these before any real deployment.

## Deployment (Vercel + Turso)

1. Create a Turso database and set `DATABASE_URL` (libsql URL), `TURSO_AUTH_TOKEN`, `JWT_SECRET` in Vercel
2. Apply schema + seed once from your machine against the remote DB (see `.env.example`)
3. Add the SMTP and/or WhatsApp variables to enable delivery
4. Deploy — `@sparticuz/chromium` handles headless PDF rendering on serverless automatically
