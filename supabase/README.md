# Supabase schema

This directory holds the SQL migrations for the ppmechanicalhvac.com lead-capture
and SEO/geo automation backend.

## Layout

```
supabase/
└── migrations/
    └── 001_initial_leads_schema.sql
```

## What the schema contains

| Table / view              | Purpose                                                                 | Anon access |
|---------------------------|-------------------------------------------------------------------------|-------------|
| `public.leads`            | All inbound leads (contact form, quote wizard, webhook).                | None        |
| `public.lead_events`      | Append-only timeline per lead (`lead.created`, `email.sent`, ...).      | None        |
| `public.webhook_deliveries` | Outbound webhook delivery log + retry queue.                          | None        |
| `public.geo_pages`        | SEO/geo landing page content (per-city pages).                          | Read where `is_published = true` |
| `public.lead_summary` (view) | Compact projection of `leads` for admin listings (security_invoker).  | None (inherits leads RLS) |

### Key design points

- **`pgcrypto`** is enabled for `gen_random_uuid()`. **`citext`** is enabled so
  `leads.email` matches case-insensitively.
- **RLS is enabled on every public table.** No permissive policies exist for
  `leads`, `lead_events`, or `webhook_deliveries`, so the anon and authenticated
  roles cannot read or write them. The service role bypasses RLS, so server-side
  API routes using `SUPABASE_SERVICE_ROLE_KEY` work normally.
- **`geo_pages`** has one anon-readable policy: `is_published = true`. Writes are
  service-role only.
- **`updated_at`** is automatically maintained via `public.set_updated_at()` triggers
  on `leads` and `geo_pages`.
- **Backwards compatibility:** the `leads` table keeps the legacy `name`,
  `home_size`, `system_age`, and `preferred_contact_time` columns alongside the
  new structured fields, so the existing `/api/leads` route and webhook payloads
  continue working without changes.
- **Idempotency:** `idempotency_key` has a partial unique index (`where ... is not null`),
  so duplicate submissions with the same key can be deduplicated server-side.
- **Validation:** `leads_has_contact_or_message` enforces that at least one of
  `email`, `phone`, or `message` is present.

## Applying the migration

### Option A — Supabase SQL Editor (no CLI)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/migrations/001_initial_leads_schema.sql`.
3. Run it. The file is written to be re-runnable (`create ... if not exists`,
   `drop ... if exists`).

### Option B — Supabase CLI

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed
and the project linked:

```bash
# One-time link
supabase link --project-ref <your-project-ref>

# Push all local migrations to the linked remote project
supabase db push
```

For local dev with `supabase start`, `supabase db reset` will replay every file
in `supabase/migrations/` in order.

## Environment variables

These belong **only** in Vercel's project settings and your local `.env.local`
— never commit them. `.env.local` is already in `.gitignore`.

| Variable                    | Where to use                                  |
|-----------------------------|-----------------------------------------------|
| `SUPABASE_URL`              | server + client                               |
| `SUPABASE_ANON_KEY`         | safe to expose to the browser                 |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only.** Bypasses RLS. Treat as a secret. |

### If the service role key was ever committed

Rotate it immediately:

1. Supabase Dashboard → **Project Settings → API → Service Role**.
2. Click **Reset** to generate a new key.
3. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel and `.env.local`.
4. Redeploy. The old key is invalidated as soon as you reset it.

The anon key can also be rotated the same way if needed. Never expose the
service role key in client-side code (`NEXT_PUBLIC_*`, `<script>`, etc.).

## Notes on the existing API

- `lib/supabase.ts` exposes `getServiceSupabase()` which uses the service role
  client. All inserts to `public.leads` go through `lib/leads.ts → captureLead()`.
- `/api/leads` and `/api/leads/webhook` write through the service role client,
  so they are unaffected by the strict RLS on `leads`.
- `/api/leads/list` reads via service role and is gated behind `ADMIN_SECRET`.
