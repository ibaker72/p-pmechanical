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

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Full URL (e.g. `https://ppmechanicalhvac.com`) — used by metadata, sitemap, structured data. |
| `SUPABASE_URL` | yes (for leads) | Supabase project URL |
| `SUPABASE_ANON_KEY` | optional | (Not used server-side; included for any future client-side reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (for leads) | Server-only key — never expose to client. Used by `/api/leads` to insert. |
| `RESEND_API_KEY` | yes (for emails) | Resend API key for transactional email |
| `OWNER_EMAIL` | yes (for emails) | Where new-lead notifications are sent |
| `ADMIN_SECRET` | yes (for `/api/leads/list`) | Bearer token to protect the leads list endpoint |
| `NEXT_PUBLIC_BUSINESS_PHONE` | optional | Overrides the placeholder phone if needed in client code |
| `NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY` | optional | Pretty-formatted display phone |

The site degrades gracefully — if Supabase or Resend env vars are missing, the form will still respond successfully and the API endpoint will return a `warning` field. Configure properly before launch.

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
npm run lint     # Next/ESLint
npm run build    # Production build
npm run start    # Run prod build locally
```

---

## License

Proprietary — © P&P Mechanical LLC. All rights reserved.
