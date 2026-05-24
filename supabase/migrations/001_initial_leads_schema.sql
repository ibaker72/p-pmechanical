-- 001_initial_leads_schema.sql
-- Initial schema for ppmechanicalhvac.com: leads capture, event timeline,
-- outbound webhook deliveries, and SEO/geo landing pages.
--
-- Conventions:
--   * All public tables have RLS enabled.
--   * Server API routes (Next.js) talk to Supabase via SUPABASE_SERVICE_ROLE_KEY,
--     which bypasses RLS. The anon role intentionally has near-zero access.
--   * Lead inserts happen server-side via /api/leads — the browser never writes
--     directly to public.leads.
--
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS guards where practical.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email column

-- ---------------------------------------------------------------------------
-- 2. leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Contact (new structured fields)
  first_name text,
  last_name text,
  full_name text,
  email citext,
  phone text,
  company text,

  -- Backwards-compatibility column for existing API/webhook payloads that
  -- send a single "name" field. New code should prefer first_name/last_name
  -- or full_name; this column is kept so /api/leads keeps working unchanged.
  name text,

  -- Lead details
  service_type text,
  job_type text,
  urgency text,
  preferred_contact_method text,
  message text,
  property_type text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,

  -- Backwards-compat fields from the existing quote wizard / webhook schema.
  home_size text,
  system_age text,
  preferred_contact_time text,

  -- Source / tracking
  source text not null default 'website',
  source_url text,
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  user_agent text,
  ip_hash text,

  -- Pipeline
  status text not null default 'new',
  priority text not null default 'normal',
  assigned_to text,
  notes text,

  -- Automation
  idempotency_key text,
  webhook_event_id text,
  outbound_webhook_sent_at timestamptz,
  email_notification_sent_at timestamptz,

  -- Enum-like constraints
  constraint leads_status_check check (
    status in ('new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'spam', 'archived')
  ),
  constraint leads_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint leads_urgency_check check (
    urgency is null or urgency in ('emergency', 'same_day', 'this_week', 'flexible')
  ),
  constraint leads_preferred_contact_method_check check (
    preferred_contact_method is null
    or preferred_contact_method in ('phone', 'email', 'text', 'any')
  ),
  -- At least one meaningful field must be present.
  constraint leads_has_contact_or_message check (
    (email is not null and length(trim(email::text)) > 0)
    or (phone is not null and length(trim(phone)) > 0)
    or (message is not null and length(trim(message)) > 0)
  )
);

-- Unique idempotency key when present (allows many NULLs).
create unique index if not exists leads_idempotency_key_unique
  on public.leads (idempotency_key)
  where idempotency_key is not null;

-- Lookup indexes
create index if not exists leads_created_at_idx     on public.leads (created_at desc);
create index if not exists leads_status_idx         on public.leads (status);
create index if not exists leads_email_idx          on public.leads (email);
create index if not exists leads_phone_idx          on public.leads (phone);
create index if not exists leads_source_idx         on public.leads (source);
create index if not exists leads_city_idx           on public.leads (city);
create index if not exists leads_service_type_idx   on public.leads (service_type);

comment on table public.leads is
  'All inbound leads (forms + webhooks). Written server-side via service role; RLS denies anon access.';

-- ---------------------------------------------------------------------------
-- 3. lead_events (timeline / audit trail)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,           -- e.g. lead.created, email.sent, webhook.sent, status.changed, note.added
  event_source text default 'system', -- e.g. system, admin, webhook, email
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists lead_events_lead_id_idx    on public.lead_events (lead_id);
create index if not exists lead_events_created_at_idx on public.lead_events (created_at desc);
create index if not exists lead_events_event_type_idx on public.lead_events (event_type);

comment on table public.lead_events is
  'Append-only timeline of activity for each lead. Server-only access.';

-- ---------------------------------------------------------------------------
-- 4. webhook_deliveries (outbound webhook attempts)
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null,
  target_url text,
  status text not null default 'pending',
  status_code integer,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  request_payload jsonb not null default '{}'::jsonb,
  response_body text,
  error_message text,

  constraint webhook_deliveries_status_check check (
    status in ('pending', 'success', 'failed', 'retrying', 'skipped')
  )
);

create index if not exists webhook_deliveries_lead_id_idx       on public.webhook_deliveries (lead_id);
create index if not exists webhook_deliveries_status_idx        on public.webhook_deliveries (status);
create index if not exists webhook_deliveries_created_at_idx    on public.webhook_deliveries (created_at desc);
create index if not exists webhook_deliveries_next_retry_at_idx on public.webhook_deliveries (next_retry_at)
  where next_retry_at is not null;

comment on table public.webhook_deliveries is
  'Outbound webhook delivery log + retry queue. Server-only access.';

-- ---------------------------------------------------------------------------
-- 5. geo_pages (future SEO landing pages per city)
-- ---------------------------------------------------------------------------
create table if not exists public.geo_pages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  city text not null,
  state text not null default 'NJ',
  slug text not null unique,
  title text,
  meta_description text,
  h1 text,
  intro_copy text,
  service_focus text,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer default 0
);

create index if not exists geo_pages_slug_idx         on public.geo_pages (slug);
create index if not exists geo_pages_city_idx         on public.geo_pages (city);
create index if not exists geo_pages_state_idx        on public.geo_pages (state);
create index if not exists geo_pages_is_published_idx on public.geo_pages (is_published);

comment on table public.geo_pages is
  'SEO/geo landing page content. Published rows are readable by anon; only service role can write.';

-- ---------------------------------------------------------------------------
-- 6. updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists geo_pages_set_updated_at on public.geo_pages;
create trigger geo_pages_set_updated_at
  before update on public.geo_pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------
-- The service role bypasses RLS, so server-side API routes using
-- SUPABASE_SERVICE_ROLE_KEY can read/write everything.
-- The anon role (used by the browser via SUPABASE_ANON_KEY) gets very narrow
-- access — only published geo_pages.

alter table public.leads              enable row level security;
alter table public.lead_events        enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.geo_pages          enable row level security;

-- --- leads: no anon/authenticated access. Service role bypasses RLS. ---
drop policy if exists "leads no anon select" on public.leads;
drop policy if exists "leads no anon insert" on public.leads;
drop policy if exists "leads no anon update" on public.leads;
drop policy if exists "leads no anon delete" on public.leads;
-- (No permissive policies => no access for anon/authenticated. Service role bypasses RLS.)

-- --- lead_events: server-only. ---
drop policy if exists "lead_events no anon access" on public.lead_events;
-- (No policies => no access for anon/authenticated.)

-- --- webhook_deliveries: server-only. ---
drop policy if exists "webhook_deliveries no anon access" on public.webhook_deliveries;
-- (No policies => no access for anon/authenticated.)

-- --- geo_pages: anon can read published rows; writes are service-role only. ---
drop policy if exists "geo_pages public read published" on public.geo_pages;
create policy "geo_pages public read published"
  on public.geo_pages
  for select
  to anon, authenticated
  using (is_published = true);

-- ---------------------------------------------------------------------------
-- 8. Views
-- ---------------------------------------------------------------------------
-- A trimmed lead view for admin listings. Marked as security_invoker so it
-- respects the caller's RLS — anon still cannot read it because the
-- underlying public.leads denies anon. Only the service role (which bypasses
-- RLS) can read this view.
drop view if exists public.lead_summary;
create view public.lead_summary
  with (security_invoker = true)
  as
  select
    id,
    created_at,
    coalesce(full_name, name, nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')) as full_name,
    email,
    phone,
    service_type,
    city,
    state,
    status,
    priority,
    source
  from public.leads;

comment on view public.lead_summary is
  'Compact projection of public.leads for admin listings. security_invoker => RLS of public.leads applies.';

-- ---------------------------------------------------------------------------
-- 9. Sample / seed data (commented out — for local dev only)
-- ---------------------------------------------------------------------------
-- insert into public.leads (full_name, email, phone, service_type, city, state, message, source)
-- values ('Test User', 'test@example.com', '+1-973-555-0100', 'ac_repair', 'Newark', 'NJ',
--         'AC is blowing warm air.', 'website');
