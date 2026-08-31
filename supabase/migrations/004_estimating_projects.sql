-- 004_estimating_projects.sql
-- Commercial mechanical estimating system — PART 2 of 3: projects, estimates,
-- revisions, scope, takeoff lines, labor conditions and the bid checklist.
--
-- Requires 003_estimating_catalog.sql.
-- RLS policy is identical to 003: enabled + forced with no permissive policies.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- 1. projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id                           uuid primary key default gen_random_uuid(),
  project_number               text not null,
  name                         text not null,

  -- Customer / general contractor
  customer_company             text,
  customer_contact_name        text,
  customer_email               citext,
  customer_phone               text,

  -- Site
  address_line1                text,
  address_line2                text,
  city                         text,
  state                        text,
  postal_code                  text,

  -- Building characteristics
  project_type                 text,
  square_footage               integer,
  floors                       integer,

  -- Schedule
  bid_due_at                   timestamptz,
  anticipated_start_date       date,
  anticipated_completion_date  date,

  estimator                    text,
  status                       text not null default 'draft',

  -- Commercial conditions that drive estimating assumptions
  prevailing_wage              boolean not null default false,
  tax_exempt                   boolean not null default false,
  bond_required                boolean not null default false,
  occupied_building            boolean not null default false,
  after_hours_work             boolean not null default false,

  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  created_by                   text,
  updated_by                   text,

  constraint projects_name_not_blank    check (length(btrim(name)) > 0),
  constraint projects_number_not_blank  check (length(btrim(project_number)) > 0),
  constraint projects_sqft_nonneg       check (square_footage is null or square_footage >= 0),
  constraint projects_floors_nonneg     check (floors is null or floors >= 0),
  constraint projects_status_allowed    check (
    status in ('draft','bidding','submitted','revision_requested','awarded','lost','cancelled')
  ),
  constraint projects_dates_ordered check (
    anticipated_start_date is null
    or anticipated_completion_date is null
    or anticipated_completion_date >= anticipated_start_date
  )
);

create unique index if not exists projects_project_number_key on public.projects (upper(btrim(project_number)));
create index if not exists projects_status_idx     on public.projects (status);
create index if not exists projects_bid_due_idx    on public.projects (bid_due_at);
create index if not exists projects_customer_idx   on public.projects (lower(customer_company));
create index if not exists projects_created_at_idx on public.projects (created_at desc);

comment on table public.projects is
  'Commercial mechanical projects. One project holds many estimate revisions.';

-- ---------------------------------------------------------------------------
-- 2. estimates  (one row per revision — revisions are never overwritten)
-- ---------------------------------------------------------------------------
create table if not exists public.estimates (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null references public.projects(id) on delete cascade,
  -- The revision this one was cloned from. on delete set null so deleting an
  -- ancestor can never cascade away later revisions.
  parent_estimate_id       uuid references public.estimates(id) on delete set null,

  estimate_number          text not null,
  revision                 integer not null default 1,
  revision_label           text,
  status                   text not null default 'draft',
  estimator                text,

  bid_date                 date,
  expiration_date          date,

  internal_notes           text,
  customer_notes           text,

  -- ---- Pricing configuration (inputs the estimator controls) ----
  overhead_percent         numeric(9,4)  not null default 0,
  contingency_percent      numeric(9,4)  not null default 0,
  -- margin  : sell = cost / (1 - margin)
  -- markup  : sell = cost * (1 + markup)
  -- fixed   : sell = fixed_sell_price
  pricing_mode             text not null default 'margin',
  markup_percent           numeric(9,4)  not null default 0,
  target_margin_percent    numeric(9,4)  not null default 0,
  fixed_sell_price         numeric(16,2),
  other_direct_cost        numeric(16,2) not null default 0,
  other_direct_cost_notes  text,
  sales_tax_percent        numeric(9,4)  not null default 0,

  -- ---- Cached totals. Always recomputed server-side from line items;
  --      never written from a client-supplied value. ----
  material_cost            numeric(16,2) not null default 0,
  labor_cost               numeric(16,2) not null default 0,
  equipment_cost           numeric(16,2) not null default 0,
  subcontractor_cost       numeric(16,2) not null default 0,
  other_cost               numeric(16,2) not null default 0,
  sales_tax_amount         numeric(16,2) not null default 0,
  direct_cost              numeric(16,2) not null default 0,
  overhead_amount          numeric(16,2) not null default 0,
  contingency_amount       numeric(16,2) not null default 0,
  profit_amount            numeric(16,2) not null default 0,
  sell_price               numeric(16,2) not null default 0,
  gross_margin_percent     numeric(9,4)  not null default 0,
  effective_markup_percent numeric(9,4)  not null default 0,
  base_labor_hours         numeric(14,4) not null default 0,
  total_labor_hours        numeric(14,4) not null default 0,
  totals_calculated_at     timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               text,
  updated_by               text,

  constraint estimates_number_not_blank    check (length(btrim(estimate_number)) > 0),
  constraint estimates_revision_positive   check (revision >= 1),
  constraint estimates_not_self_parent     check (parent_estimate_id is null or parent_estimate_id <> id),
  constraint estimates_status_allowed check (
    status in ('draft','ready_for_review','approved_internal','submitted','awarded','lost','superseded')
  ),
  constraint estimates_pricing_mode_allowed check (pricing_mode in ('margin','markup','fixed')),
  constraint estimates_overhead_range      check (overhead_percent    >= 0 and overhead_percent    <= 500),
  constraint estimates_contingency_range   check (contingency_percent >= 0 and contingency_percent <= 500),
  constraint estimates_markup_range        check (markup_percent      >= 0 and markup_percent      <= 1000),
  -- A 100% gross margin is mathematically unreachable (sell = cost/0).
  constraint estimates_margin_range        check (target_margin_percent >= 0 and target_margin_percent < 100),
  constraint estimates_sales_tax_range     check (sales_tax_percent   >= 0 and sales_tax_percent   <= 100),
  constraint estimates_fixed_price_nonneg  check (fixed_sell_price is null or fixed_sell_price >= 0),
  constraint estimates_other_cost_nonneg   check (other_direct_cost >= 0),
  constraint estimates_dates_ordered check (
    bid_date is null or expiration_date is null or expiration_date >= bid_date
  )
);

create unique index if not exists estimates_project_revision_key on public.estimates (project_id, revision);
create index if not exists estimates_project_idx    on public.estimates (project_id);
create index if not exists estimates_status_idx     on public.estimates (status);
create index if not exists estimates_parent_idx     on public.estimates (parent_estimate_id);
create index if not exists estimates_bid_date_idx   on public.estimates (bid_date);
create index if not exists estimates_updated_at_idx on public.estimates (updated_at desc);
create index if not exists estimates_number_idx     on public.estimates (upper(btrim(estimate_number)));

comment on table public.estimates is
  'One row per estimate revision. Superseded revisions are retained forever — never updated in place.';
comment on column public.estimates.sell_price is
  'Server-computed. Recalculated from line items by lib/estimating/calc.ts; never trusted from the client.';

-- ---------------------------------------------------------------------------
-- 3. estimate_labor_conditions
--    Project-wide productivity conditions applied to every labor line, with
--    the modifier factor SNAPSHOTTED so later master edits cannot rewrite a
--    historical bid.
-- ---------------------------------------------------------------------------
create table if not exists public.estimate_labor_conditions (
  id                uuid primary key default gen_random_uuid(),
  estimate_id       uuid not null references public.estimates(id) on delete cascade,
  labor_modifier_id uuid references public.labor_modifiers(id) on delete set null,
  code              text not null,
  name              text not null,
  factor            numeric(9,4) not null default 1.0,
  note              text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint elc_factor_range check (factor > 0 and factor <= 10)
);

create unique index if not exists estimate_labor_conditions_unique on public.estimate_labor_conditions (estimate_id, code);
create index if not exists estimate_labor_conditions_estimate_idx on public.estimate_labor_conditions (estimate_id, sort_order);

comment on table public.estimate_labor_conditions is
  'Snapshotted labor productivity conditions for one estimate. Effective factor = product(factor).';

-- ---------------------------------------------------------------------------
-- 4. estimate_scope_items
--    One table with a `disposition` discriminator covers inclusions,
--    exclusions, clarifications, assumptions, alternates and allowances.
--    Keeps ordering, filtering and proposal rendering in one place.
-- ---------------------------------------------------------------------------
create table if not exists public.estimate_scope_items (
  id                uuid primary key default gen_random_uuid(),
  estimate_id       uuid not null references public.estimates(id) on delete cascade,
  scope_category_id uuid references public.scope_categories(id) on delete set null,
  scope_code        text,
  scope_name        text,
  disposition       text not null default 'included',
  title             text not null,
  customer_text     text,
  internal_notes    text,
  -- Dollar value for allowances and alternates. Alternates may be negative
  -- (deduct alternates are a normal commercial construct).
  amount            numeric(16,2),
  is_uncertain      boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        text,
  updated_by        text,
  constraint esi_title_not_blank check (length(btrim(title)) > 0),
  constraint esi_disposition_allowed check (
    disposition in ('included','excluded','clarification','assumption','alternate','allowance')
  ),
  -- Allowances are additive dollars and must not be negative; alternates may be.
  constraint esi_allowance_nonneg check (disposition <> 'allowance' or amount is null or amount >= 0)
);

create index if not exists estimate_scope_items_estimate_idx on public.estimate_scope_items (estimate_id, disposition, sort_order);
create index if not exists estimate_scope_items_scope_idx    on public.estimate_scope_items (scope_category_id);

comment on column public.estimate_scope_items.disposition is
  'included | excluded | clarification | assumption | alternate | allowance';

-- ---------------------------------------------------------------------------
-- 5. estimate_takeoff_items
--    The estimate's cost lines. Every pricing input is SNAPSHOTTED here at the
--    moment the line is created, so changing a material price or an assembly
--    later never mutates a historical bid.
-- ---------------------------------------------------------------------------
create table if not exists public.estimate_takeoff_items (
  id                          uuid primary key default gen_random_uuid(),
  estimate_id                 uuid not null references public.estimates(id) on delete cascade,
  scope_category_id           uuid references public.scope_categories(id) on delete set null,
  scope_code                  text,
  scope_name                  text,

  line_type                   text not null default 'material',

  -- Traceability back to master data. All on delete set null: history survives
  -- deletion of the master record it originated from.
  source_material_id          uuid references public.materials(id)       on delete set null,
  source_assembly_id          uuid references public.assemblies(id)      on delete set null,
  source_assembly_item_id     uuid references public.assembly_items(id)  on delete set null,
  source_assembly_version     integer,
  -- Components created by exploding an assembly point at the parent group row.
  parent_item_id              uuid references public.estimate_takeoff_items(id) on delete cascade,

  labor_rate_id               uuid references public.labor_rates(id)     on delete set null,
  equipment_rate_id           uuid references public.equipment_rates(id) on delete set null,
  vendor_id                   uuid references public.vendors(id)         on delete set null,

  description                 text not null,
  customer_description        text,
  quantity                    numeric(14,4) not null default 0,
  unit                        text not null default 'EA',

  -- ---- Snapshotted pricing inputs ----
  unit_material_cost          numeric(14,4) not null default 0,
  material_waste_percent      numeric(9,4)  not null default 0,
  labor_hours_per_unit        numeric(14,4) not null default 0,
  labor_rate_snapshot         numeric(14,4) not null default 0,
  labor_rate_name             text,
  -- Extra line-level productivity factor, multiplied on top of the
  -- estimate-wide conditions. 1.0 = no line-specific adjustment.
  labor_modifier_factor       numeric(9,4)  not null default 1.0,
  -- When false the estimate-wide conditions are not applied to this line
  -- (e.g. shop fabrication hours that site conditions do not affect).
  apply_estimate_conditions   boolean not null default true,
  equipment_cost              numeric(16,2) not null default 0,
  subcontract_cost            numeric(16,2) not null default 0,
  other_cost                  numeric(16,2) not null default 0,

  -- ---- Override audit ----
  original_unit_material_cost numeric(14,4),
  is_cost_overridden          boolean not null default false,
  override_reason             text,

  disposition                 text not null default 'included',
  is_taxable                  boolean not null default true,
  internal_notes              text,
  sort_order                  integer not null default 0,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  text,
  updated_by                  text,

  constraint eti_description_not_blank check (length(btrim(description)) > 0),
  constraint eti_not_self_parent       check (parent_item_id is null or parent_item_id <> id),
  constraint eti_line_type_allowed check (
    line_type in ('material','assembly','assembly_component','labor','equipment','subcontract','allowance','lump_sum','other')
  ),
  constraint eti_disposition_allowed check (
    disposition in ('included','excluded','alternate','allowance')
  ),
  constraint eti_quantity_nonneg   check (quantity >= 0),
  constraint eti_unit_cost_nonneg  check (unit_material_cost >= 0),
  constraint eti_waste_range       check (material_waste_percent >= 0 and material_waste_percent <= 100),
  constraint eti_hours_nonneg      check (labor_hours_per_unit >= 0),
  constraint eti_labor_rate_nonneg check (labor_rate_snapshot >= 0),
  constraint eti_modifier_range    check (labor_modifier_factor > 0 and labor_modifier_factor <= 10),
  constraint eti_equipment_nonneg  check (equipment_cost   >= 0),
  constraint eti_subcontract_nonneg check (subcontract_cost >= 0),
  -- other_cost may be negative to support credits / deduct lines.
  constraint eti_override_has_original check (
    is_cost_overridden = false or original_unit_material_cost is not null
  )
);

create index if not exists eti_estimate_idx        on public.estimate_takeoff_items (estimate_id, sort_order);
create index if not exists eti_estimate_type_idx   on public.estimate_takeoff_items (estimate_id, line_type);
create index if not exists eti_estimate_scope_idx  on public.estimate_takeoff_items (estimate_id, scope_category_id);
create index if not exists eti_parent_idx          on public.estimate_takeoff_items (parent_item_id);
create index if not exists eti_source_material_idx on public.estimate_takeoff_items (source_material_id);
create index if not exists eti_source_assembly_idx on public.estimate_takeoff_items (source_assembly_id);
create index if not exists eti_vendor_idx          on public.estimate_takeoff_items (vendor_id);

comment on table public.estimate_takeoff_items is
  'Estimate cost lines with fully snapshotted pricing inputs. Master-data edits never alter existing rows.';
comment on column public.estimate_takeoff_items.parent_item_id is
  'Set on rows produced by exploding an assembly; points at the assembly group row.';

-- ---------------------------------------------------------------------------
-- 6. estimate_checklist_items  (bid confidence / completeness review)
-- ---------------------------------------------------------------------------
create table if not exists public.estimate_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  code        text not null,
  prompt      text not null,
  category    text,
  answer      text not null default 'needs_review',
  is_critical boolean not null default false,
  note        text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text,
  constraint eci_answer_allowed check (answer in ('yes','no','na','needs_review'))
);

create unique index if not exists estimate_checklist_items_unique on public.estimate_checklist_items (estimate_id, code);
create index if not exists estimate_checklist_items_estimate_idx on public.estimate_checklist_items (estimate_id, sort_order);
create index if not exists estimate_checklist_items_unresolved_idx
  on public.estimate_checklist_items (estimate_id) where answer = 'needs_review';

-- ---------------------------------------------------------------------------
-- 7. updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','estimates','estimate_labor_conditions','estimate_scope_items',
    'estimate_takeoff_items','estimate_checklist_items'
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
    'projects','estimates','estimate_labor_conditions','estimate_scope_items',
    'estimate_takeoff_items','estimate_checklist_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
