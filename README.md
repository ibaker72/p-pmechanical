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

| Variable                             | Required                    | Description                                                                                  |
| ------------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`               | yes                         | Full URL (e.g. `https://ppmechanicalhvac.com`) — used by metadata, sitemap, structured data. |
| `SUPABASE_URL`                       | yes (for leads)             | Supabase project URL                                                                         |
| `SUPABASE_ANON_KEY`                  | optional                    | (Not used server-side; included for any future client-side reads)                            |
| `SUPABASE_SERVICE_ROLE_KEY`          | yes (for leads)             | Server-only key — never expose to client. Used by `/api/leads` to insert.                    |
| `RESEND_API_KEY`                     | yes (for emails)            | Resend API key for transactional email                                                       |
| `OWNER_EMAIL`                        | yes (for emails)            | Where new-lead notifications are sent                                                        |
| `ADMIN_SECRET`                       | yes (for `/api/leads/list`) | Bearer token to protect the leads list endpoint                                              |
| `UPSTASH_REDIS_REST_URL`             | yes in prod                 | Upstash Redis REST URL — backs rate limiting and idempotency on `/api/leads*`.               |
| `UPSTASH_REDIS_REST_TOKEN`           | yes in prod                 | Upstash Redis REST token.                                                                    |
| `WEBHOOK_SECRET`                     | optional                    | If set, `/api/leads/webhook` requires `X-Webhook-Secret` to match.                           |
| `OUTBOUND_WEBHOOK_URL`               | optional                    | Where to POST `lead.created` events (e.g. OpenClaw, n8n, Make, Zapier).                      |
| `OUTBOUND_WEBHOOK_SECRET`            | optional                    | HMAC-SHA256 key used to sign the outbound event payload (in `X-Signature`).                  |
| `NEXT_PUBLIC_BUSINESS_PHONE`         | optional                    | Overrides the placeholder phone if needed in client code                                     |
| `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` | optional                    | Pretty-formatted display phone                                                               |

The site degrades gracefully — if Supabase, Resend, or Upstash env vars are missing, the form will still respond successfully and the API endpoint will return a `warnings` array. Configure properly before launch. The schema is enforced by `npm run validate:env` (auto-run in `prebuild`).

---

## Database setup (Supabase)

The canonical schema lives in [`supabase/migrations/`](./supabase/migrations). The latest migration adds the `leads` table, a `status` check constraint, an auto-updating `updated_at` trigger, indexes for the queries the app actually runs (created_at desc, status, source, lower(email), phone), and enables RLS (server uses the service-role key and bypasses it).

**Apply to a remote Supabase project** (recommended):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Apply to a local stack** (for development):

```bash
npx supabase start          # spins up Postgres + Studio at :54323
npx supabase db reset       # applies every migration from scratch
```

**Or paste manually** — open the SQL editor in the Supabase dashboard and run the contents of the latest file in `supabase/migrations/`.

To add a new migration:

```bash
npx supabase migration new <name>
# edit the generated file in supabase/migrations/
npx supabase db push
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
├── sitemap.ts               # Auto-generated sitemap
├── robots.ts                # Auto-generated robots
├── not-found.tsx
└── layout.tsx               # Root layout + fonts

components/
├── layout/                  # Navbar, Footer
├── home/                    # Hero, Stats, Services grid, Why-choose-us, Lead magnet, Service areas, Testimonials, Emergency CTA, Blog preview
├── forms/                   # Contact, Inline lead, Quote wizard, Lead magnet
├── seo/                     # JSON-LD components
└── ui/                      # Shadcn-style primitives

lib/
├── constants.ts             # Business info, services, locations, testimonials
├── supabase.ts              # Service-role client
├── resend.ts                # Transactional email helpers
├── leads.ts                 # captureLead() orchestrates DB + email
├── validations.ts           # Zod schemas
├── blog.ts                  # Filesystem MDX loader
└── utils.ts                 # cn() helper

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

## Lint & build

```bash
npm run lint            # Next/ESLint
npm run type-check      # tsc --noEmit
npm run format          # prettier --write .
npm run validate:env    # Zod-validates env vars (also runs in prebuild)
npm run validate:content # Lints MDX frontmatter and body length
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
