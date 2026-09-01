# Supabase schema

This directory holds the SQL migrations for the ppmechanicalhvac.com lead-capture
and SEO/geo automation backend.

## Layout

```
supabase/
└── migrations/
    ├── 001_initial_leads_schema.sql        # leads, events, webhooks, geo_pages
    ├── 002_geo_pages_content.sql           # AI landing-page content columns
    ├── 003_estimating_catalog.sql          # cost library (price book, rates, assemblies)
    ├── 004_estimating_projects.sql         # projects, estimates, takeoff, scope, checklist
    └── 005_estimating_documents_jobs.sql   # bid documents, jobs, job budgets
```

Apply them **in numeric order**. 003 must come before 004, and 004 before 005.

## What the schema contains

| Table / view                 | Purpose                                                              | Anon access                      |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| `public.leads`               | All inbound leads (contact form, quote wizard, webhook).             | None                             |
| `public.lead_events`         | Append-only timeline per lead (`lead.created`, `email.sent`, ...).   | None                             |
| `public.webhook_deliveries`  | Outbound webhook delivery log + retry queue.                         | None                             |
| `public.geo_pages`           | SEO/geo landing page content (per-city pages).                       | Read where `is_published = true` |
| `public.lead_summary` (view) | Compact projection of `leads` for admin listings (security_invoker). | None (inherits leads RLS)        |

### Commercial estimating system (migrations 003–005)

Every table below has **RLS enabled and forced with zero permissive policies**,
and `anon` / `authenticated` are explicitly `REVOKE`d. That means the browser
cannot read or write any of it under any circumstances. All access is
server-side through `SUPABASE_SERVICE_ROLE_KEY`, behind the `/admin` session
check (`lib/auth/server.ts`).

> **`service_role` needs table grants, not just BYPASSRLS.** These migrations
> never `GRANT` to `service_role`; they rely on Supabase's stock default
> privileges for schema `public`. If those defaults are ever narrowed, every
> table created afterwards is unreadable by the server and the admin renders
> "The estimating database is not ready" with `42501 permission denied`.
> Migration `007_restore_service_role_grants.sql` repairs both the existing
> grants and the default. Check it with:
>
> ```sql
> select has_table_privilege('service_role', 'public.projects', 'SELECT'); -- expect true
> select has_table_privilege('anon',         'public.projects', 'SELECT'); -- expect false
> ```
>
> `npm run diagnose:db` reports the same thing from the app's own client.

| Table                                                   | Purpose                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `scope_categories`                                      | Configurable mechanical scope taxonomy (HVAC equipment, ductwork, …). Data, not code.                   |
| `material_categories`                                   | Price-book category tree.                                                                               |
| `vendors`                                               | Suppliers **and** subcontractors — independent boolean flags on one record.                             |
| `labor_rates`                                           | Burdened hourly classifications, with optional prevailing-wage rate.                                    |
| `labor_modifiers`                                       | Productivity factors (occupied building, high ceiling, …). Seeded at 1.00 — no assumptions asserted.    |
| `materials`                                             | The material price book: cost, waste, productivity, preferred vendor.                                   |
| `equipment_rates`                                       | Rental/owned equipment with daily/weekly/monthly rates, mobilization and delivery.                      |
| `assemblies` / `assembly_items`                         | Reusable installed-work templates and their components.                                                 |
| `projects`                                              | Commercial projects: customer, site, schedule, commercial conditions.                                   |
| `estimates`                                             | **One row per revision.** Pricing configuration plus server-computed cached totals.                     |
| `estimate_labor_conditions`                             | Snapshotted productivity conditions for one estimate.                                                   |
| `estimate_scope_items`                                  | Inclusions, exclusions, clarifications, assumptions, alternates, allowances (one `disposition` column). |
| `estimate_takeoff_items`                                | The cost lines, with every pricing input snapshotted.                                                   |
| `estimate_checklist_items`                              | Bid confidence / completeness review.                                                                   |
| `project_documents`                                     | Metadata for private bid documents. Bytes live in Storage.                                              |
| `document_extractions` / `document_extraction_findings` | **Schema only.** Extension point for future plan/spec analysis. No AI is implemented.                   |
| `jobs` / `job_budgets`                                  | Awarded estimate → job with an immutable budget snapshot.                                               |
| `job_cost_entries`                                      | **Schema only.** Extension point for actual-vs-estimate.                                                |

#### Design guarantees worth knowing

- **Historical integrity.** `estimate_takeoff_items` stores its own
  `unit_material_cost`, `material_waste_percent`, `labor_hours_per_unit` and
  `labor_rate_snapshot`. Every foreign key back to master data
  (`source_material_id`, `source_assembly_id`, `labor_rate_id`, …) is
  `ON DELETE SET NULL`, so editing or deleting a price-book entry can never
  move a bid that was already built.
- **Revisions are never overwritten.** `estimates` is unique on
  `(project_id, revision)`, and `parent_estimate_id` is `ON DELETE SET NULL` so
  removing an ancestor cannot cascade away later revisions.
- **Money precision.** Unit costs are `numeric(14,4)`, extended amounts
  `numeric(16,2)`, percentages `numeric(9,4)`, hours `numeric(14,4)`.
  Application-side arithmetic uses fixed-point bigints (`lib/estimating/decimal.ts`),
  never floats.
- **Constraints protect the money.** Negative quantities, costs and hours are
  rejected at the database level, as is a target gross margin of 100% or more
  (which implies an infinite sell price).
- **A job pins its estimate.** `jobs.source_estimate_id` is `ON DELETE RESTRICT`,
  so an estimate that became a job budget cannot be deleted.

#### Storage bucket

Migration 005 creates a **private** Storage bucket named `project-documents`
(`public = false`) inside an exception handler. If your database user cannot
write `storage.buckets`, the migration still applies and prints a notice —
create the bucket by hand in **Supabase → Storage → New bucket**, with public
access **off**. Override the name with `SUPABASE_DOCUMENTS_BUCKET`.

No `storage.objects` policies are created, so `anon` and `authenticated` cannot
list, read or write bucket contents. Downloads are served through 5-minute
signed URLs minted server-side.

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
2. Paste and run each migration **in numeric order**: `001`, `002`, `003`,
   `004`, `005`.
3. Every file is written to be re-runnable (`create ... if not exists`,
   `drop ... if exists`), so re-applying one is safe.
4. Verify with `npm run test:estimating-db`, which checks that the tables
   exist, that `anon` can read nothing, and that the document bucket is
   private. It skips silently when Supabase env vars are absent.

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

| Variable                    | Where to use                                      |
| --------------------------- | ------------------------------------------------- |
| `SUPABASE_URL`              | server + client                                   |
| `SUPABASE_ANON_KEY`         | safe to expose to the browser                     |
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
