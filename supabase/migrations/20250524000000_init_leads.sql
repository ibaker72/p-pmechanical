-- Initial schema: the `leads` table that every lead capture (forms,
-- /api/leads, /api/leads/webhook) writes to.
--
-- Shape mirrors `LeadRecord` in lib/supabase.ts. Status defaults to 'new'
-- and is constrained so operations dashboards stay consistent.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Contact
  name text,
  email text,
  phone text,

  -- Job context
  service_type text,
  home_size text,
  system_age text,
  message text,
  city text,
  preferred_contact_time text,

  -- Attribution
  source text not null,

  -- Ops
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'won', 'lost', 'spam', 'duplicate')),
  notes text
);

comment on table public.leads is
  'Inbound leads from every channel (forms, webhook, agents). Server-only writes via SUPABASE_SERVICE_ROLE_KEY.';

-- Maintain updated_at on every write.
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
  for each row
  execute function public.set_updated_at();

-- Indexes for the queries the app actually runs:
--   /api/leads/list  → order by created_at desc
--   dashboards       → filter by status / source
--   dedup checks     → lookup by email or phone
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_source_idx     on public.leads (source);
create index if not exists leads_email_idx      on public.leads (lower(email));
create index if not exists leads_phone_idx      on public.leads (phone);

-- Row-level security. The service-role key bypasses RLS, which is what the
-- server uses, but enabling RLS prevents accidental anon-key access to the
-- table from a misconfigured client.
alter table public.leads enable row level security;

-- No public policies are defined: anon and authenticated users cannot read or
-- write. The Next.js API routes use the service-role key and bypass RLS.
