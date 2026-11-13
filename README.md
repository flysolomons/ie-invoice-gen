# Invoice Generator

A small-team invoicing app built with Next.js. Create and issue invoices, download them as PDFs, record client payments with numbered receipts, and keep track of business expenses with their receipt files.

## Features

- **Clients**: create, edit, archive and restore clients; each client has its own invoice history.
- **Invoices**
  - Draft invoices with line items, quantities (up to 3 decimals), per-line tax and a percent or fixed discount. Totals update live and are recalculated on the server.
  - **Issuing** gives an invoice a gap-free number (`INV-0001`, `INV-0002`, …) and locks it from editing.
  - Void (owner only) and duplicate-as-draft.
  - **PDF** download with DRAFT, VOID and PAID watermarks.
  - Status filter: Draft, Issued, Partially paid, Overdue, Paid, Void. Overdue is worked out from the due date in the business timezone, so no scheduled job is needed.
- **Payments & receipts**
  - Record full or partial payments; the invoice status updates automatically and overpayments are refused.
  - Each payment gets a receipt number (`RCT-0001`, …) and a downloadable **receipt PDF**.
  - Payments are never edited or deleted. The owner can **reverse** one, which recalculates the invoice and marks the receipt REVERSED.
- **Expenses**
  - Record vendor, category, amount, currency, date and notes, with a receipt photo or PDF attached.
  - Uploads are checked by their actual content (JPG, PNG, WebP or PDF, up to 4 MB) and stored privately.
  - Filter by month, category or search, with totals per currency.
- **Team & access**
  - Email/password login through Neon Auth.
  - A `members` table controls who can use the app, with owner and member roles enforced on the server.
  - Public sign-up is disabled.
- **Business settings**: name, address, tax ID, default currency, tax rate, payment terms, timezone and number prefixes.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), lucide-react, sonner |
| Database | Neon Postgres with Drizzle ORM and drizzle-kit migrations |
| Auth | Neon Auth (managed Better Auth) via `@neon/auth` |
| PDFs | `@react-pdf/renderer` with the Inter font (no headless browser needed) |
| File storage | Local disk in development, private Vercel Blob in production |
| Validation | Zod |
| Tests | Vitest |

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- A [Neon](https://neon.tech) project with **Auth** enabled (Console → your project → Auth)

### 1. Install

```bash
git clone https://github.com/flysolomons/ie-invoice-gen.git
cd ie-invoice-gen
npm install
```

### 2. Configure environment

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string. Any other Postgres URL also works locally. |
| `NEON_AUTH_BASE_URL` | yes | Your Auth URL from Neon Console → Auth → Configuration |
| `NEON_AUTH_COOKIE_SECRET` | yes | 32+ random characters for signing session cookies |
| `APP_URL` | yes | Public URL of the app, e.g. `http://localhost:3000` |
| `STORAGE_DRIVER` | no | `local` or `vercel-blob`. If blank, Vercel Blob is used when a token is set, otherwise local disk. |
| `BLOB_READ_WRITE_TOKEN` | prod | Set automatically when you connect a Vercel Blob store |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` / `SEED_OWNER_NAME` | setup | The first owner account, created by `npm run seed` |

Generate a cookie secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> `.env.local` is git-ignored. Never commit real credentials.

### 3. Create the database tables

```bash
npm run db:migrate
```

### 4. Create the owner account

Set `SEED_OWNER_*` in `.env.local`, then run:

```bash
npm run seed
```

This creates the owner in Neon Auth, links them as an **owner** member, and adds the business settings row and default expense categories. It's safe to run again.

### 5. Run it

```bash
npm run dev
```

Open http://localhost:3000, sign in with the owner account, then fill in **Settings** (business details, currency, timezone) before creating invoices.

## Adding users: Microsoft sign-in

Staff sign in with their work Microsoft account. Anyone whose **verified** email is on an allowed domain (for example `@flysolomons.com` or `@flysolomons.com.sb`) joins automatically as a **member**. Owners then manage people under **Settings → Team**: they can make someone an owner, demote them to member, or remove and restore access. A removed person can't get back in by signing in again.

### 1. Register the app in Microsoft Entra (IT admin)

1. Go to [entra.microsoft.com](https://entra.microsoft.com), then **Entra ID → App registrations → New registration**.
   - **Name:** `Invoices`.
   - **Supported account types:** **Accounts in this organizational directory only (single tenant)**.
   - **Redirect URI:** platform **Web**, value `{NEON_AUTH_BASE_URL}/callback/microsoft`. Copy the exact value from the Neon Console's "Add OAuth provider" dialog. Add one per Neon branch you use.
2. Copy the **Application (client) ID** and the **Directory (tenant) ID** from the Overview page.
3. Under **Certificates & secrets**, create a **New client secret** and copy its **Value**. It is shown only once. Note the expiry date and renew it before then.
4. Under **Token configuration → Add optional claim → ID**, select **`acct`**, **`xms_edov`** and **`email`**, then accept the Microsoft Graph `email` permission prompt.
   > This step is required. Without these claims Microsoft doesn't confirm that the email belongs to your organisation, Neon Auth treats it as unverified, and **nobody is let in automatically**. Guests and personal Microsoft accounts are never treated as verified.

### 2. Add the provider in Neon (owner)

1. In Neon Console, open your project and branch, then **Settings → Auth → OAuth providers → Add OAuth provider → Microsoft**.
2. Enter the Client ID and Client Secret, and set the **tenant** to your Directory (tenant) ID. This restricts sign-in to your organisation.
3. Under **Trusted domains**, add `http://localhost:3000` for development and your production URL, e.g. `https://invoices.example.com`.

### 3. Switch it on in the app

Set these in `.env.local` locally and in your Vercel project's environment variables:

```bash
AUTH_MICROSOFT_ENABLED=true
ALLOWED_EMAIL_DOMAINS=flysolomons.com,flysolomons.com.sb
```

Domains must match exactly: `flysolomons.com` does not allow `mail.flysolomons.com` or look-alike domains. With `ALLOWED_EMAIL_DOMAINS` empty, nobody joins automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Unit tests (Vitest) |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database with Drizzle Studio |
| `npm run seed` | Create or link the owner account and default data |

## Deploying to Vercel

1. Import the repository into Vercel.
2. Add the environment variables `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, and `APP_URL` (your production URL).
3. **Storage → Create → Blob** and connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`, and receipt uploads go to private Blob storage. Uploads fail with a clear error if no Blob store is connected, because Vercel's filesystem is read-only.
4. In Neon Console → Auth, add your Vercel domain as a **trusted domain**.
5. Run `npm run db:migrate` against the production database before the first deploy, and `npm run seed` once to create the owner.

Optionally, turn off **sign-up** in Neon Console → Auth → Configuration. The app already blocks sign-up through its own routes, and accounts that aren't in `members` can't get in.

## Project structure

```
src/
  app/
    (auth)/            login, no-access, sign-in/out actions
    (app)/             signed-in pages: dashboard, invoices, clients,
                       payments, expenses, settings (+ server actions)
    api/
      auth/[...path]   Neon Auth proxy (sign-up blocked)
      invoices/[id]/pdf
      payments/[id]/receipt
      expenses/[id]/file
  components/          app components and shadcn/ui primitives
  db/                  Drizzle schema, client and migrations
  lib/                 pure logic: money, invoice totals, status rules,
                       validation, upload checks, PDF templates
  server/              server-only queries, numbering, storage, PDF rendering
  proxy.ts             route protection (Next.js 16 "proxy", formerly middleware)
scripts/seed.ts        owner and default data setup
```

## Design notes

- **Money** is stored as integer cents and never calculated with floating point. Totals are recalculated on the server on every save. Discounts are spread across lines before tax, and leftover cents are allocated so the parts always add up exactly.
- **Numbering** uses a row-locked counter inside the issuing transaction, so invoice and receipt numbers are unique and have no gaps, even when several people issue at once.
- **Issued invoices are immutable.** To correct one, void it and duplicate it. Voided numbers stay used.
- **Payments** lock the invoice row while recording, so concurrent payments can't exceed the balance. The database also enforces `paid ≤ total`.
- **Access control**: `src/proxy.ts` redirects signed-out visitors. Every page, server action and file route also checks membership and role on the server.
- **Uploads** are identified by their content, not by file name or browser-reported type. They're stored under random keys and served with `nosniff` and a sandboxing Content-Security-Policy.

## Roadmap

- [ ] Dashboard: outstanding, overdue, received this month, expenses this month
- [ ] Team invites via shareable invite links
- [ ] Optional emailing of invoices and receipts (Resend/SMTP); the schema already has an email log

## Licence

No licence has been chosen yet, so all rights are reserved by default.
