-- 005_estimating_documents_jobs.sql
-- Commercial mechanical estimating system — PART 3 of 3: project documents,
-- future AI plan/spec extraction extension points, and awarded-estimate ->
-- job budget conversion.
--
-- Requires 003 and 004.
--
-- NOTE on the extraction tables: they are SCHEMA ONLY. No AI extraction is
-- implemented in this pass and no UI surfaces it. They exist so a future
-- "Analyze Plans & Specs" workflow has a home that already enforces the
-- non-negotiable rule: findings land in a review queue, never directly in an
-- estimate. See document_extraction_findings.review_status.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. project_documents
--    Metadata rows. Bytes live in the private Supabase Storage bucket named by
--    SUPABASE_DOCUMENTS_BUCKET (default 'project-documents'). Access is always
--    through short-lived signed URLs minted server-side.
-- ---------------------------------------------------------------------------
create table if not exists public.project_documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id)  on delete cascade,
  estimate_id  uuid references public.estimates(id) on delete set null,
  file_name    text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  category     text not null default 'other',
  notes        text,
  uploaded_by  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint project_documents_file_name_not_blank check (length(btrim(file_name)) > 0),
  constraint project_documents_size_nonneg check (size_bytes is null or size_bytes >= 0),
  constraint project_documents_category_allowed check (
    category in ('plans','specifications','equipment_schedule','addendum',
                 'vendor_quote','subcontractor_quote','photo','other')
  )
);

create unique index if not exists project_documents_storage_path_key on public.project_documents (storage_path);
create index if not exists project_documents_project_idx  on public.project_documents (project_id, created_at desc);
create index if not exists project_documents_estimate_idx on public.project_documents (estimate_id);
create index if not exists project_documents_category_idx on public.project_documents (category);

comment on table public.project_documents is
  'Private bid-document metadata. Bytes live in a private storage bucket; never publicly readable.';

-- ---------------------------------------------------------------------------
-- 2. document_extractions  (FUTURE — schema only, no implementation)
-- ---------------------------------------------------------------------------
create table if not exists public.document_extractions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.project_documents(id) on delete cascade,
  estimate_id   uuid references public.estimates(id) on delete set null,
  status        text not null default 'pending',
  provider      text,
  model         text,
  started_at    timestamptz,
  completed_at  timestamptz,
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint document_extractions_status_allowed check (
    status in ('pending','processing','complete','failed','cancelled')
  )
);

create index if not exists document_extractions_document_idx on public.document_extractions (document_id);
create index if not exists document_extractions_estimate_idx on public.document_extractions (estimate_id);

comment on table public.document_extractions is
  'Extension point for a future plan/spec analysis run. Not implemented in this pass.';

-- ---------------------------------------------------------------------------
-- 3. document_extraction_findings  (FUTURE — schema only)
--    review_status defaults to 'pending': a finding is NEVER billable until an
--    estimator accepts it and it is linked to a takeoff item.
-- ---------------------------------------------------------------------------
create table if not exists public.document_extraction_findings (
  id                     uuid primary key default gen_random_uuid(),
  extraction_id          uuid not null references public.document_extractions(id) on delete cascade,
  finding_type           text not null,
  label                  text not null,
  description            text,
  quantity               numeric(14,4),
  unit                   text,
  equipment_tag          text,
  manufacturer           text,
  model                  text,
  capacity               text,
  drawing_reference      text,
  spec_section           text,
  confidence             numeric(5,4),
  review_status          text not null default 'pending',
  reviewed_by            text,
  reviewed_at            timestamptz,
  linked_takeoff_item_id uuid references public.estimate_takeoff_items(id) on delete set null,
  raw                    jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint def_review_status_allowed check (
    review_status in ('pending','accepted','edited','rejected')
  ),
  constraint def_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint def_finding_type_allowed check (
    finding_type in ('equipment_count','equipment_schedule','spec_requirement',
                     'insulation_requirement','controls_requirement','drawing_reference','other')
  )
);

create index if not exists def_extraction_idx on public.document_extraction_findings (extraction_id);
create index if not exists def_review_idx     on public.document_extraction_findings (review_status);

comment on column public.document_extraction_findings.review_status is
  'An extracted finding is never billable until an estimator accepts it. Defaults to pending by design.';

-- ---------------------------------------------------------------------------
-- 4. jobs  (an awarded estimate becomes a job)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id)  on delete restrict,
  -- on delete restrict: an estimate that a job was built from cannot be deleted.
  source_estimate_id uuid references public.estimates(id) on delete restrict,
  job_number         text not null,
  name               text not null,
  status             text not null default 'planning',
  contract_value     numeric(16,2) not null default 0,
  start_date         date,
  end_date           date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         text,
  updated_by         text,
  constraint jobs_name_not_blank      check (length(btrim(name)) > 0),
  constraint jobs_number_not_blank    check (length(btrim(job_number)) > 0),
  constraint jobs_contract_nonneg     check (contract_value >= 0),
  constraint jobs_status_allowed      check (status in ('planning','active','on_hold','complete','closed','cancelled')),
  constraint jobs_dates_ordered       check (start_date is null or end_date is null or end_date >= start_date)
);

create unique index if not exists jobs_job_number_key on public.jobs (upper(btrim(job_number)));
-- One job per awarded estimate revision.
create unique index if not exists jobs_source_estimate_key on public.jobs (source_estimate_id) where source_estimate_id is not null;
create index if not exists jobs_project_idx on public.jobs (project_id);
create index if not exists jobs_status_idx  on public.jobs (status);

-- ---------------------------------------------------------------------------
-- 5. job_budgets  (immutable budget snapshot taken from the awarded estimate)
-- ---------------------------------------------------------------------------
create table if not exists public.job_budgets (
  id                            uuid primary key default gen_random_uuid(),
  job_id                        uuid not null references public.jobs(id) on delete cascade,
  source_estimate_id            uuid references public.estimates(id) on delete set null,
  version                       integer not null default 1,
  material_budget               numeric(16,2) not null default 0,
  labor_hours_budget            numeric(14,4) not null default 0,
  labor_cost_budget             numeric(16,2) not null default 0,
  equipment_budget              numeric(16,2) not null default 0,
  subcontract_budget            numeric(16,2) not null default 0,
  other_budget                  numeric(16,2) not null default 0,
  total_cost_budget             numeric(16,2) not null default 0,
  contract_value                numeric(16,2) not null default 0,
  expected_gross_profit         numeric(16,2) not null default 0,
  expected_gross_margin_percent numeric(9,4)  not null default 0,
  snapshot_at                   timestamptz not null default now(),
  notes                         text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    text,
  constraint job_budgets_version_positive check (version >= 1)
);

create unique index if not exists job_budgets_job_version_key on public.job_budgets (job_id, version);
create index if not exists job_budgets_job_idx on public.job_budgets (job_id);

comment on table public.job_budgets is
  'Point-in-time budget snapshot from an awarded estimate. New versions are added, never edited in place.';

-- ---------------------------------------------------------------------------
-- 6. job_cost_entries  (FUTURE — actual vs estimate)
--    source_takeoff_item_id is what makes estimated-vs-actual traceable back to
--    the exact estimate line that produced the budget.
-- ---------------------------------------------------------------------------
create table if not exists public.job_cost_entries (
  id                     uuid primary key default gen_random_uuid(),
  job_id                 uuid not null references public.jobs(id) on delete cascade,
  cost_type              text not null,
  source_takeoff_item_id uuid references public.estimate_takeoff_items(id) on delete set null,
  scope_category_id      uuid references public.scope_categories(id) on delete set null,
  vendor_id              uuid references public.vendors(id) on delete set null,
  description            text not null,
  quantity               numeric(14,4) not null default 0,
  unit                   text,
  amount                 numeric(16,2) not null default 0,
  labor_hours            numeric(14,4) not null default 0,
  incurred_on            date,
  reference              text,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             text,
  constraint jce_cost_type_allowed check (
    cost_type in ('material','labor','equipment','subcontract','other')
  ),
  constraint jce_description_not_blank check (length(btrim(description)) > 0),
  constraint jce_labor_hours_nonneg    check (labor_hours >= 0)
);

create index if not exists jce_job_idx    on public.job_cost_entries (job_id, incurred_on);
create index if not exists jce_source_idx on public.job_cost_entries (source_takeoff_item_id);
create index if not exists jce_type_idx   on public.job_cost_entries (job_id, cost_type);

comment on table public.job_cost_entries is
  'Extension point for actual job costs. source_takeoff_item_id traces an actual back to the estimate line.';

-- ---------------------------------------------------------------------------
-- 7. updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'project_documents','document_extractions','document_extraction_findings',
    'jobs','job_budgets','job_cost_entries'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security — no anon/authenticated access at all.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'project_documents','document_extractions','document_extraction_findings',
    'jobs','job_budgets','job_cost_entries'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Private storage bucket for bid documents.
--    Wrapped in an exception handler so the migration still applies on a
--    database where the storage schema is unavailable (e.g. plain Postgres).
--    public = false, so objects are only reachable via signed URLs.
-- ---------------------------------------------------------------------------
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('project-documents', 'project-documents', false)
  on conflict (id) do update set public = false;
exception
  when undefined_table or insufficient_privilege then
    raise notice 'storage.buckets not available — create the private "project-documents" bucket manually.';
end $$;

-- No storage.objects policies are created: with none, the anon and
-- authenticated roles cannot read or write bucket contents. The server mints
-- signed URLs using the service role.

notify pgrst, 'reload schema';
