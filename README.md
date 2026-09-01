# P&P Mechanical LLC — Marketing Website

Production-grade Next.js 14 (App Router) marketing site for **P&P Mechanical LLC**, an HVAC and boiler contractor serving Clifton, NJ and the surrounding North Jersey region.

Built with:

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + Shadcn-style primitives + Radix UI
- **Framer Motion** for tasteful section reveals and counters
- **Supabase** for lead capture
- **Resend** for transactional email (owner notification + customer confirmation)
- **React Hook Form + Zod** for typed, validated forms
- **MDX** blog content with `next-mdx-remote`

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in values
npm run dev
```

The site runs at <http://localhost:3000>.

---

## Environment variables

| Variable                             | Required                                 | Description                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`               | yes                                      | Full URL (e.g. `https://ppmechanicalhvac.com`) — used by metadata, sitemap, structured data.                                                                 |
| `SUPABASE_URL`                       | yes (for leads)                          | Supabase project URL                                                                                                                                         |
| `SUPABASE_ANON_KEY`                  | optional                                 | (Not used server-side; included for any future client-side reads)                                                                                            |
| `SUPABASE_SERVICE_ROLE_KEY`          | yes (for leads)                          | Server-only key — never expose to client. Used by `/api/leads` to insert.                                                                                    |
| `RESEND_API_KEY`                     | yes (for emails)                         | Resend API key for transactional email                                                                                                                       |
| `OWNER_EMAIL`                        | yes (for emails)                         | Where new-lead notifications are sent                                                                                                                        |
| `ADMIN_SECRET`                       | yes (for `/api/leads/list` and `/admin`) | Bearer token for the leads list endpoint **and** the sign-in password for the `/admin` estimating system. Must be ≥ 16 characters for admin sign-in to work. |
| `ADMIN_SESSION_SECRET`               | optional                                 | Dedicated HMAC key for admin session cookies, so the sign-in password and the signing key can rotate independently. Defaults to `ADMIN_SECRET`.              |
| `ADMIN_EMAIL`                        | optional                                 | Recorded in `created_by` / `updated_by` on estimating records. Defaults to `owner`.                                                                          |
| `SUPABASE_DOCUMENTS_BUCKET`          | optional                                 | Private Supabase Storage bucket for bid documents. Defaults to `project-documents`.                                                                          |
| `UPSTASH_REDIS_REST_URL`             | yes in prod                              | Upstash Redis REST URL — backs rate limiting and idempotency on `/api/leads*` and `/admin/login`. Must be a bare `https://<db>.upstash.io` origin, no path.  |
| `UPSTASH_REDIS_REST_TOKEN`           | yes in prod                              | Upstash Redis REST token.                                                                                                                                    |
| `WEBHOOK_SECRET`                     | optional                                 | If set, `/api/leads/webhook` requires `X-Webhook-Secret` to match.                                                                                           |
| `OUTBOUND_WEBHOOK_URL`               | optional                                 | Where to POST `lead.created` events (e.g. OpenClaw, n8n, Make, Zapier).                                                                                      |
| `OUTBOUND_WEBHOOK_SECRET`            | optional                                 | HMAC-SHA256 key used to sign the outbound event payload (in `X-Signature`).                                                                                  |
| `NEXT_PUBLIC_BUSINESS_PHONE`         | optional                                 | Overrides the placeholder phone if needed in client code                                                                                                     |
| `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` | optional                                 | Pretty-formatted display phone                                                                                                                               |

The site degrades gracefully — if Supabase, Resend, or Upstash env vars are missing, the form will still respond successfully and the API endpoint will return a `warnings` array. Configure properly before launch. The schema is enforced by `npm run validate:env` (auto-run in `prebuild`).

---

## Database setup (Supabase)

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  service_type text,
  home_size text,
  system_age text,
  message text,
  source text,
  preferred_contact_time text,
  city text,
  status text default 'new',
  notes text
);

create index leads_created_at_idx on leads (created_at desc);
```

---

## Lead capture flow

All forms POST to `/api/leads` with:

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "service_type": "string?",
  "home_size": "string?",
  "system_age": "string?",
  "message": "string?",
  "city": "string?",
  "preferred_contact_time": "string?",
  "source": "contact_form|quote_wizard|savings_guide|service_page|location_page|webhook"
}
```

On success:

1. Row inserted to `leads` table
2. Email sent to `OWNER_EMAIL` (lead summary)
3. Email sent to the customer (confirmation)
4. If `source === 'savings_guide'`, the customer is also emailed a PDF link

### External webhook

The same endpoint is aliased at `/api/leads/webhook` for stable integration with external automation tools (GoHighLevel, OpenClaw, Zapier, Make, etc.). POST with the same body.

**Hardening (all opt-in via env vars):**

- **Honeypot**: every form includes a hidden `website_url` field. Any submission with a non-empty value is silently dropped (returns 200, never written).
- **Rate limiting** (Upstash): form submissions are limited to 10/min per IP; webhook submissions to 60/min per secret. Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to enable.
  - A limiter failure is never a 5xx. If Redis is unreachable or answers with something the client cannot parse, `lib/ratelimit.ts` logs the fault (with the URL and token scrubbed) and falls back to a stricter in-process limiter — 5/min for forms, 30/min for webhooks, per server instance. A circuit breaker stops re-trying Redis for 30s after three consecutive failures. Requests are still limited while degraded; the limiter never fails open.
  - With no Upstash credentials at all (local dev) the limiter is a documented no-op and reports `skipped: true`. Credentials that are present but malformed count as an outage, not a no-op.
- **Webhook auth**: set `WEBHOOK_SECRET` and present the same value in the `X-Webhook-Secret` header on every webhook POST.
- **Idempotency**: clients may pass `Idempotency-Key: <uuid>` — the API returns the original `lead_id` on retries within a 24-hour window.

Response shape:

```json
{
  "ok": true,
  "lead_id": "uuid|null",
  "stored": true,
  "created_at": "2025-05-24T...",
  "idempotent": false,
  "emails": { "owner": "sent|failed|skipped", "customer": "sent|failed|skipped" },
  "warnings": ["…"]
}
```

### Admin: viewing leads

`GET /api/leads/list?secret=<ADMIN_SECRET>` returns the most recent 500 leads as JSON. Also accepts `Authorization: Bearer <ADMIN_SECRET>`.

---

## Commercial estimating system (`/admin`)

An authenticated, internal system for estimating commercial mechanical work:
projects → estimates → takeoff → pricing → proposal → job budget. It lives
inside this application; it is not a second app.

### Signing in

`/admin` is protected by `middleware.ts` **and** by a `requireAdmin()` check in
the admin layout. Sign in at `/admin/login` with the value of `ADMIN_SECRET`.
A successful sign-in sets an HMAC-SHA256-signed, HttpOnly, SameSite=Lax session
cookie that expires after 12 hours. Sign-in attempts are rate limited through
the same Upstash limiter the public forms use.

This deliberately reuses the application's existing authorization primitive
rather than introducing a competing identity system. There is one owner
account.

### What it does

| Area         | Route                                                                                                                                     | Notes                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Dashboard    | `/admin`                                                                                                                                  | Pipeline value, bids due, recently updated estimates.                                                           |
| Projects     | `/admin/projects`                                                                                                                         | Customer, site, schedule and commercial conditions (prevailing wage, tax exempt, occupied building…).           |
| Estimates    | `/admin/estimates/[id]/…`                                                                                                                 | Ten tabs: overview, scope, takeoff, materials, labor, equipment, subcontractors, pricing, bid review, proposal. |
| Assemblies   | `/admin/assemblies`                                                                                                                       | Reusable installed-work templates that explode into priced takeoff lines.                                       |
| Cost library | `/admin/materials`, `/admin/labor-rates`, `/admin/labor-modifiers`, `/admin/equipment-rates`, `/admin/vendors`, `/admin/scope-categories` | All editable in the admin; nothing is hardcoded.                                                                |
| Jobs         | `/admin/jobs`                                                                                                                             | Awarded estimate converted to a job with an immutable budget snapshot.                                          |

### The rules the system is built on

- **Historical integrity.** Adding a material or an assembly to an estimate
  _copies_ its price and productivity values onto the takeoff line. Editing the
  price book afterwards never moves a bid that was already built. Revisions are
  cloned, never overwritten.
- **The server owns the numbers.** Every total is recomputed server-side by
  `lib/estimating/calc.ts` after each mutation. A client-supplied total is never
  trusted or stored.
- **Decimal-safe money.** `lib/estimating/decimal.ts` is fixed-point arithmetic
  on `bigint`, not floats. Rounding is half-up away from zero, matching what an
  estimator sees in a spreadsheet.
- **Markup is not margin.** $100,000 of cost at a 20% target gross margin sells
  for **$125,000** (`cost ÷ (1 − margin)`), not $120,000. Both figures are shown
  side by side on the pricing tab.
- **The math is visible.** Labor productivity modifiers are shown step by step
  (1,400 base hours × 1.15 × 1.10 = 1,771), never collapsed into one number.
- **Nothing internal reaches the customer.** The proposal page reads no cost,
  rate, markup, margin, profit or internal-note field. The only figure that
  crosses is the total proposed amount, plus alternate and allowance amounts the
  estimator explicitly entered for the proposal.

### Commands

```bash
npm run test              # calculation engine + auth + geo sanitizer
npm run test:estimating   # 74 calculation-engine tests
npm run test:auth         # 26 session/authorization tests
npm run test:estimating-db  # DB + RLS integration tests (skips without Supabase env)
npm run seed:estimating -- --confirm   # clearly-fictional demo cost library (dev only)
npm run seed:estimating -- --confirm --remove
```

### Deliberately not built yet

These have database schema and clear extension points but **no implementation
and no UI that pretends otherwise**:

- **AI plan/spec extraction.** `document_extractions` and
  `document_extraction_findings` exist, with `review_status` defaulting to
  `pending` so a future extraction can never add a billable item on its own.
  No AI is wired up and no button claims it is.
- **Actual vs estimate.** `job_cost_entries.source_takeoff_item_id` traces an
  actual cost back to the estimate line that budgeted it. Nothing writes to it
  yet.
- **CSV price-book import.** The material model and actions are structured for
  it; the importer itself is not built.

---

## File tree

```
app/
├── (marketing)/             # Site layout group
│   ├── page.tsx             # Home
│   ├── about/
│   ├── contact/
│   ├── quote/               # Quote wizard
│   ├── thank-you/
│   ├── free-hvac-guide/     # Lead-magnet landing page
│   ├── services/
│   │   ├── page.tsx         # Hub
│   │   └── [slug]/page.tsx  # Dynamic service page
│   ├── locations/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── privacy/
│   └── terms/
├── api/
│   └── leads/
│       ├── route.ts         # POST — primary lead endpoint
│       ├── webhook/route.ts # Alias for external CRMs
│       └── list/route.ts    # GET — admin (protected by ADMIN_SECRET)
├── admin/                   # Authenticated commercial estimating system
│   ├── layout.tsx           # requireAdmin() + sidebar shell
│   ├── page.tsx             # Dashboard
│   ├── login/               # Sign in (ADMIN_SECRET) + session actions
│   ├── projects/            # List, new, detail, edit
│   ├── estimates/
│   │   ├── page.tsx         # All estimates
│   │   ├── new/
│   │   └── [estimateId]/    # overview · scope · takeoff · materials · labor
│   │                        # equipment · subcontractors · pricing · checklist · proposal
│   ├── assemblies/          # Reusable installed-work templates
│   ├── materials/           # Material price book (search, filter, paginate)
│   ├── labor-rates/         # Burdened classifications
│   ├── labor-modifiers/     # Productivity factors
│   ├── equipment-rates/     # Rental / owned equipment
│   ├── vendors/             # Suppliers & subcontractors
│   ├── scope-categories/    # Configurable scope taxonomy
│   └── jobs/                # Awarded estimate → job budget
├── sitemap.ts               # Auto-generated sitemap
├── robots.ts                # Auto-generated robots
├── not-found.tsx
└── layout.tsx               # Root layout + fonts

middleware.ts                # Edge guard for /admin/*

components/
├── admin/                   # Estimating UI: shell, tables, forms, action plumbing
│   ├── takeoff/             # Takeoff grid, row actions, add-line forms
│   └── catalog/             # Price book, labor, equipment, vendor, assembly forms
├── layout/                  # Navbar, Footer
├── home/                    # Hero, Stats, Services grid, Why-choose-us, Lead magnet, Service areas, Testimonials, Emergency CTA, Blog preview
├── forms/                   # Contact, Inline lead, Quote wizard, Lead magnet
├── seo/                     # JSON-LD components
└── ui/                      # Shadcn-style primitives

lib/
├── auth/
│   ├── admin-session.ts     # HMAC-signed session tokens (Edge + Node)
│   └── server.ts            # requireAdmin() / getAdminSession()
├── estimating/
│   ├── decimal.ts           # Fixed-point money math (bigint, no floats)
│   ├── calc.ts              # The pricing engine — pure and unit tested
│   ├── assembly.ts          # Assembly explosion + snapshotting
│   ├── revision.ts          # Revision cloning (parent/child remapping)
│   ├── recalc.ts            # Row → totals, and persisting cached totals
│   ├── queries.ts           # Read paths, designed to avoid N+1
│   ├── page-data.ts         # Request-cached estimate workspace loader
│   ├── validation.ts        # Zod schemas for every mutation
│   ├── db.ts                # Service-role client + DB error translation
│   ├── numbering.ts         # Project / job / revision numbering
│   ├── constants.ts         # Statuses, units, bid-checklist template
│   ├── types.ts             # Row types + ActionResult
│   ├── format.ts            # Currency / hours / date formatting
│   └── actions/             # Server actions (all behind withAdmin())
├── constants.ts             # Business info, services, locations, testimonials
├── supabase.ts              # Service-role client
├── resend.ts                # Transactional email helpers
├── leads.ts                 # captureLead() orchestrates DB + email
├── validations.ts           # Zod schemas
├── blog.ts                  # Filesystem MDX loader
└── utils.ts                 # cn() helper

scripts/
├── test-estimating-calc.ts  # 74 calculation-engine tests
├── test-admin-auth.ts       # 26 session/authorization tests
├── test-estimating-db.ts    # DB + RLS integration tests (skips without env)
└── seed-estimating-demo.ts  # Fictional dev cost library

content/blog/                # 3 seed MDX posts
public/
├── images/                  # Site images
└── downloads/               # Put the savings guide PDF here
```

---

## TODOs before launch

Search the codebase for `// TODO:` comments — these mark business-specific values that must be replaced. All centralized in `lib/constants.ts`:

- Phone number
- Street address & ZIP
- Email address
- NJ HVACR license number
- Social profile URLs
- The lead-magnet PDF (`public/downloads/pp-hvac-savings-guide.pdf`)
- Open Graph default image (`public/og-default.png`, 1200x630)

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Set environment variables in the Vercel dashboard.
4. Deploy.

### Recommended Vercel settings

- Region: `iad1` (US East — closest to NJ users)
- Framework preset: Next.js (auto-detected)
- Build command: `next build`
- Output directory: `.next`

---

## Performance & accessibility

- Fonts: `next/font` with `display: swap` (Barlow Condensed display, DM Sans body)
- Images: Next `<Image>` with WebP/AVIF, sized appropriately
- Skip-to-content link for keyboard users
- All interactive elements use semantic HTML or proper `aria-label`s
- Lighthouse targets: 95+ Performance, 100 SEO, 95+ Accessibility, 100 Best Practices

---

## Lint, test & build

```bash
npm run lint            # Next/ESLint
npm run type-check      # tsc --noEmit
npm run format          # prettier --write .
npm run validate:env    # Zod-validates env vars (also runs in prebuild)
npm run validate:content # Lints MDX frontmatter and body length
npm run test            # Calculation engine + admin auth + geo sanitizer tests
npm run test:estimating-db # DB/RLS integration tests (skips without Supabase env)
npm run analyze         # Bundle analyzer (ANALYZE=true next build)
npm run build           # Production build
npm run start           # Run prod build locally
npm run new:post -- "Post Title"  # Scaffold a new MDX blog post
npm run leads:export -- --days 90 # Export leads from Supabase to CSV
npm run images:optimize           # Convert public/images/** to WebP+AVIF
```

Pre-commit hooks run via [lefthook](https://github.com/evilmartians/lefthook):

```bash
npx lefthook install
```

---

## Agents & Automation

This site exposes a first-class surface for autonomous agents (OpenClaw, custom Claude/GPT agents, n8n, Make, Zapier, GoHighLevel). An agent can discover the site, read its services, and submit leads without ever scraping HTML.

### Discovery

| URL                       | Purpose                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `/.well-known/agent.json` | Machine-readable manifest — capabilities, auth, rate limits, action schemas.          |
| `/api/services`           | JSON: business info, every service, every service area with geo.                      |
| `/llms.txt`               | Short markdown summary for AI answer engines (Claude, ChatGPT, Perplexity, Gemini).   |
| `/llms-full.txt`          | Long-form bundle: every service, location, FAQ, review, blog excerpt — for grounding. |
| `/ai.txt`                 | Crawler directive (permissions + attribution preference).                             |
| `/sitemap.xml`            | Standard sitemap.                                                                     |
| `/robots.txt`             | Standard robots.                                                                      |

### Submitting a lead (OpenClaw / any agent)

```bash
curl -X POST https://ppmechanicalhvac.com/api/leads/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "name": "Jane Smith",
    "phone": "(973) 555-0123",
    "email": "jane@example.com",
    "service_type": "Boiler Installation",
    "city": "Clifton",
    "message": "Need a quote on replacing my 1990s gas boiler.",
    "source": "openclaw"
  }'
```

The response is machine-friendly:

```json
{ "ok": true, "lead_id": "…", "stored": true, "created_at": "…", "idempotent": false }
```

Retrying the same `Idempotency-Key` within 24h returns the original `lead_id` instead of creating a duplicate.

### Receiving `lead.created` events

Set `OUTBOUND_WEBHOOK_URL` (and ideally `OUTBOUND_WEBHOOK_SECRET`) and the site will POST every successful lead to your endpoint:

```json
{
  "type": "lead.created",
  "occurred_at": "2025-05-24T17:00:00.000Z",
  "lead_id": "uuid",
  "lead": { "name": "…", "phone": "…", "source": "contact_form", "...": "..." }
}
```

The payload is signed with HMAC-SHA256 in the `X-Signature` header (`t={unix_ms},v1={hex_digest}`). Verify with:

```ts
import crypto from 'node:crypto';
const [t, v1] = req.headers['x-signature'].split(',').map((p) => p.split('=')[1]);
const expected = crypto
  .createHmac('sha256', process.env.OUTBOUND_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
const valid = crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
```

Outbound POSTs are fire-and-forget with a 5-second timeout — a slow or failing OpenClaw endpoint never blocks a lead capture.

---

## License

Proprietary — © P&P Mechanical LLC. All rights reserved.
