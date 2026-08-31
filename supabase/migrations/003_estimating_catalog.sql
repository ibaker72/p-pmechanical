-- 003_estimating_catalog.sql
-- Commercial mechanical estimating system — PART 1 of 3: reusable master data.
--
-- This migration creates the "price book" / knowledge base that estimates draw
-- from: scope categories, material categories, vendors & subcontractors, labor
-- classifications, labor productivity modifiers, materials, equipment/rental
-- rates, and reusable assemblies.
--
-- Conventions inherited from 001_initial_leads_schema.sql:
--   * Every public table has RLS enabled with NO permissive policies, so the
--     anon and authenticated Postgres roles cannot read or write anything.
--     All access is server-side through SUPABASE_SERVICE_ROLE_KEY, which
--     bypasses RLS. Commercial estimating data is never client-reachable.
--   * `public.set_updated_at()` (created in 001) maintains updated_at.
--   * Safe to re-run: create ... if not exists / drop ... if exists.
--
-- Money/precision policy:
--   * unit costs / rates      numeric(14,4)  -- sub-cent precision for unit math
--   * extended amounts        numeric(16,2)  -- dollars and cents
--   * percentages             numeric(9,4)   -- 12.5000 means 12.5%
--   * labor hours             numeric(14,4)
--   * multiplier factors      numeric(9,4)   -- 1.1500 means +15%

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Shared helper: updated_at trigger (defined in 001, re-declared defensively so
-- this file can be applied to a database where only 001's tables were created).
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

-- ---------------------------------------------------------------------------
-- 1. scope_categories
--    Configurable mechanical scope taxonomy (HVAC Equipment, Ductwork, ...).
--    Deliberately data-driven: adding a scope must never require a code change.
-- ---------------------------------------------------------------------------
create table if not exists public.scope_categories (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  text,
  updated_by  text,
  constraint scope_categories_code_format check (code ~ '^[a-z0-9_]+$')
);

create unique index if not exists scope_categories_code_key on public.scope_categories (code);
create index if not exists scope_categories_active_idx on public.scope_categories (is_active, sort_order);

comment on table public.scope_categories is
  'Configurable mechanical scope taxonomy used by estimates, assemblies and takeoff lines.';

-- ---------------------------------------------------------------------------
-- 2. material_categories  (self-referencing tree: category -> subcategory)
-- ---------------------------------------------------------------------------
create table if not exists public.material_categories (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  name       text not null,
  parent_id  uuid references public.material_categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,
  constraint material_categories_code_format check (code ~ '^[a-z0-9_]+$'),
  constraint material_categories_not_self_parent check (parent_id is null or parent_id <> id)
);

create unique index if not exists material_categories_code_key on public.material_categories (code);
create index if not exists material_categories_parent_idx on public.material_categories (parent_id);

comment on table public.material_categories is
  'Hierarchy for the material price book. parent_id null = top-level category.';

-- ---------------------------------------------------------------------------
-- 3. vendors  (suppliers AND subcontractors — one directory, two flags)
-- ---------------------------------------------------------------------------
create table if not exists public.vendors (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  category         text,
  contact_name     text,
  email            citext,
  phone            text,
  website          text,
  address_line1    text,
  city             text,
  state            text,
  postal_code      text,
  is_supplier      boolean not null default true,
  is_subcontractor boolean not null default false,
  is_active        boolean not null default true,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       text,
  updated_by       text,
  constraint vendors_company_name_not_blank check (length(btrim(company_name)) > 0)
);

create unique index if not exists vendors_company_name_key on public.vendors (lower(btrim(company_name)));
create index if not exists vendors_category_idx  on public.vendors (category);
create index if not exists vendors_is_active_idx on public.vendors (is_active);
create index if not exists vendors_is_sub_idx    on public.vendors (is_subcontractor) where is_subcontractor = true;

comment on table public.vendors is
  'Suppliers and subcontractors. is_supplier / is_subcontractor are independent flags.';

-- ---------------------------------------------------------------------------
-- 4. labor_rates  (burdened labor classifications)
-- ---------------------------------------------------------------------------
create table if not exists public.labor_rates (
  id                          uuid primary key default gen_random_uuid(),
  code                        text not null,
  name                        text not null,
  description                 text,
  -- Burdened rate: wage + taxes + insurance + benefits. NOT the raw wage.
  base_hourly_rate            numeric(14,4) not null default 0,
  overtime_multiplier         numeric(9,4)  not null default 1.5,
  doubletime_multiplier       numeric(9,4)  not null default 2.0,
  prevailing_wage_hourly_rate numeric(14,4),
  notes                       text,
  is_active                   boolean not null default true,
  sort_order                  integer not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  text,
  updated_by                  text,
  constraint labor_rates_code_format         check (code ~ '^[a-z0-9_]+$'),
  constraint labor_rates_base_rate_nonneg    check (base_hourly_rate >= 0),
  constraint labor_rates_pw_rate_nonneg      check (prevailing_wage_hourly_rate is null or prevailing_wage_hourly_rate >= 0),
  constraint labor_rates_ot_multiplier_range check (overtime_multiplier   >= 1 and overtime_multiplier   <= 10),
  constraint labor_rates_dt_multiplier_range check (doubletime_multiplier >= 1 and doubletime_multiplier <= 10)
);

create unique index if not exists labor_rates_code_key on public.labor_rates (code);
create index if not exists labor_rates_active_idx on public.labor_rates (is_active, sort_order);

comment on column public.labor_rates.base_hourly_rate is
  'Fully burdened hourly cost (wage + burden). The estimating engine never uses a raw wage.';

-- ---------------------------------------------------------------------------
-- 5. labor_modifiers  (productivity conditions: occupied building, high ceiling)
-- ---------------------------------------------------------------------------
create table if not exists public.labor_modifiers (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null,
  description text,
  category    text,
  -- 1.0000 = normal conditions. 1.1500 = 15% more hours. 0.9500 = 5% fewer.
  factor      numeric(9,4) not null default 1.0,
  notes       text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  text,
  updated_by  text,
  constraint labor_modifiers_code_format  check (code ~ '^[a-z0-9_]+$'),
  constraint labor_modifiers_factor_range check (factor > 0 and factor <= 10)
);

create unique index if not exists labor_modifiers_code_key on public.labor_modifiers (code);
create index if not exists labor_modifiers_active_idx on public.labor_modifiers (is_active, sort_order);

comment on table public.labor_modifiers is
  'Configurable productivity factors. Company-specific assumptions, not industry constants.';

-- ---------------------------------------------------------------------------
-- 6. materials  (the price book)
-- ---------------------------------------------------------------------------
create table if not exists public.materials (
  id                    uuid primary key default gen_random_uuid(),
  sku                   text,
  category_id           uuid references public.material_categories(id) on delete set null,
  subcategory           text,
  name                  text not null,
  description           text,
  manufacturer          text,
  model                 text,
  unit_of_measure       text not null default 'EA',
  unit_cost             numeric(14,4) not null default 0,
  preferred_vendor_id   uuid references public.vendors(id) on delete set null,
  waste_percent         numeric(9,4) not null default 0,
  -- Default productivity assumption: labor hours consumed per unit_of_measure.
  default_labor_unit    numeric(14,4) not null default 0,
  labor_unit_type       text not null default 'hours_per_unit',
  default_labor_rate_id uuid references public.labor_rates(id) on delete set null,
  is_taxable            boolean not null default true,
  is_active             boolean not null default true,
  last_cost_update_at   timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            text,
  updated_by            text,
  constraint materials_name_not_blank    check (length(btrim(name)) > 0),
  constraint materials_unit_cost_nonneg  check (unit_cost >= 0),
  constraint materials_waste_range       check (waste_percent >= 0 and waste_percent <= 100),
  constraint materials_labor_unit_nonneg check (default_labor_unit >= 0),
  constraint materials_uom_allowed check (
    unit_of_measure in ('EA','LF','SF','SY','CF','LB','TON','GAL','BOX','ROLL','SET','LOT','HR','DAY','PR','CY')
  ),
  constraint materials_labor_unit_type_allowed check (
    labor_unit_type in ('hours_per_unit','hours_per_100_units','hours_per_1000_units')
  )
);

-- SKU is optional but must be unique when present.
create unique index if not exists materials_sku_key on public.materials (upper(btrim(sku))) where sku is not null and btrim(sku) <> '';
create index if not exists materials_category_idx  on public.materials (category_id);
create index if not exists materials_is_active_idx on public.materials (is_active);
create index if not exists materials_vendor_idx    on public.materials (preferred_vendor_id);
create index if not exists materials_name_idx      on public.materials (lower(name));

comment on table public.materials is
  'Reusable material price book. Estimates snapshot these values; later edits never rewrite history.';
comment on column public.materials.labor_unit_type is
  'How default_labor_unit is expressed. hours_per_100_units / hours_per_1000_units are normalized by the engine.';

-- ---------------------------------------------------------------------------
-- 7. equipment_rates  (rental / owned equipment)
-- ---------------------------------------------------------------------------
create table if not exists public.equipment_rates (
  id                 uuid primary key default gen_random_uuid(),
  code               text,
  name               text not null,
  category           text,
  unit               text not null default 'DAY',
  daily_rate         numeric(14,4) not null default 0,
  weekly_rate        numeric(14,4) not null default 0,
  monthly_rate       numeric(14,4) not null default 0,
  mobilization_cost  numeric(14,4) not null default 0,
  delivery_cost      numeric(14,4) not null default 0,
  pickup_cost        numeric(14,4) not null default 0,
  vendor_id          uuid references public.vendors(id) on delete set null,
  notes              text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         text,
  updated_by         text,
  constraint equipment_rates_name_not_blank check (length(btrim(name)) > 0),
  constraint equipment_rates_unit_allowed   check (unit in ('DAY','WEEK','MONTH','EA','LOT','HR')),
  constraint equipment_rates_rates_nonneg   check (
    daily_rate >= 0 and weekly_rate >= 0 and monthly_rate >= 0
    and mobilization_cost >= 0 and delivery_cost >= 0 and pickup_cost >= 0
  )
);

create unique index if not exists equipment_rates_code_key on public.equipment_rates (lower(btrim(code))) where code is not null and btrim(code) <> '';
create index if not exists equipment_rates_active_idx on public.equipment_rates (is_active);
create index if not exists equipment_rates_vendor_idx on public.equipment_rates (vendor_id);

-- ---------------------------------------------------------------------------
-- 8. assemblies  (reusable installed-system templates)
-- ---------------------------------------------------------------------------
create table if not exists public.assemblies (
  id                uuid primary key default gen_random_uuid(),
  code              text,
  name              text not null,
  description       text,
  scope_category_id uuid references public.scope_categories(id) on delete set null,
  unit              text not null default 'EA',
  -- Bumped whenever components change, so estimate snapshots can record which
  -- generation of the assembly they were built from.
  version           integer not null default 1,
  notes             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        text,
  updated_by        text,
  constraint assemblies_name_not_blank check (length(btrim(name)) > 0),
  constraint assemblies_version_positive check (version >= 1),
  constraint assemblies_unit_allowed check (
    unit in ('EA','LF','SF','SY','CF','LB','TON','GAL','BOX','ROLL','SET','LOT','HR','DAY','PR','CY')
  )
);

create unique index if not exists assemblies_code_key on public.assemblies (lower(btrim(code))) where code is not null and btrim(code) <> '';
create index if not exists assemblies_active_idx on public.assemblies (is_active);
create index if not exists assemblies_scope_idx  on public.assemblies (scope_category_id);
create index if not exists assemblies_name_idx   on public.assemblies (lower(name));

comment on table public.assemblies is
  'Reusable installed-work templates (e.g. "5 Ton RTU - Standard Installation"). Exploded into estimate takeoff lines with snapshotted pricing.';

-- ---------------------------------------------------------------------------
-- 9. assembly_items  (assembly components)
-- ---------------------------------------------------------------------------
create table if not exists public.assembly_items (
  id                   uuid primary key default gen_random_uuid(),
  assembly_id          uuid not null references public.assemblies(id) on delete cascade,
  sort_order           integer not null default 0,
  item_type            text not null,
  -- Optional links back to master records. on delete set null so an assembly
  -- survives (with its own cost values) if a master record is removed.
  material_id          uuid references public.materials(id)        on delete set null,
  labor_rate_id        uuid references public.labor_rates(id)      on delete set null,
  equipment_rate_id    uuid references public.equipment_rates(id)  on delete set null,
  vendor_id            uuid references public.vendors(id)          on delete set null,
  description          text not null,
  -- Quantity of this component per ONE unit of the parent assembly.
  quantity_per_unit    numeric(14,4) not null default 0,
  unit                 text not null default 'EA',
  unit_cost            numeric(14,4) not null default 0,
  waste_percent        numeric(9,4)  not null default 0,
  labor_hours_per_unit numeric(14,4) not null default 0,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint assembly_items_type_allowed check (
    item_type in ('material','labor','equipment','subcontract','other')
  ),
  constraint assembly_items_desc_not_blank check (length(btrim(description)) > 0),
  constraint assembly_items_qty_nonneg     check (quantity_per_unit >= 0),
  constraint assembly_items_cost_nonneg    check (unit_cost >= 0),
  constraint assembly_items_hours_nonneg   check (labor_hours_per_unit >= 0),
  constraint assembly_items_waste_range    check (waste_percent >= 0 and waste_percent <= 100)
);

create index if not exists assembly_items_assembly_idx on public.assembly_items (assembly_id, sort_order);
create index if not exists assembly_items_material_idx on public.assembly_items (material_id);

comment on column public.assembly_items.quantity_per_unit is
  'Quantity of this component consumed by ONE unit of the parent assembly.';

-- ---------------------------------------------------------------------------
-- 10. updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'scope_categories','material_categories','vendors','labor_rates','labor_modifiers',
    'materials','equipment_rates','assemblies','assembly_items'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Row Level Security — deny everything to anon/authenticated.
--     Server-side code uses the service role, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'scope_categories','material_categories','vendors','labor_rates','labor_modifiers',
    'materials','equipment_rates','assemblies','assembly_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- Defense in depth: even if a policy were added by mistake, no grants exist.
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 12. Seed the scope taxonomy and labor-modifier conditions.
--     These are STRUCTURAL defaults (category names / condition names), not
--     pricing. Factors default to 1.0 so nothing is asserted as an industry
--     fact — the estimator sets real values in /admin/labor-modifiers.
-- ---------------------------------------------------------------------------
insert into public.scope_categories (code, name, sort_order) values
  ('hvac_equipment',        'HVAC Equipment',           10),
  ('sheet_metal',           'Sheet Metal / Ductwork',   20),
  ('refrigerant_piping',    'Refrigerant Piping',       30),
  ('hydronic_piping',       'Hydronic Piping',          40),
  ('gas_piping',            'Gas Piping',               50),
  ('plumbing_condensate',   'Plumbing / Condensate',    60),
  ('insulation',            'Insulation',               70),
  ('controls_bms',          'Controls / BMS',           80),
  ('exhaust_ventilation',   'Exhaust / Ventilation',    90),
  ('supports_hangers',      'Supports / Hangers',      100),
  ('roof_work',             'Roof Work',               110),
  ('demolition',            'Demolition',              120),
  ('testing_balancing',     'Testing & Balancing',     130),
  ('startup_commissioning', 'Startup / Commissioning', 140),
  ('rigging_crane',         'Rigging / Crane',         150),
  ('equipment_rental',      'Equipment Rental',        160),
  ('permits_fees',          'Permits / Fees',          170),
  ('electrical_sub',        'Electrical Subcontract',  180),
  ('controls_sub',          'Controls Subcontract',    190),
  ('miscellaneous',         'Miscellaneous',           200),
  ('allowances',            'Allowances',              210),
  ('alternates',            'Alternates',              220)
on conflict (code) do nothing;

insert into public.labor_modifiers (code, name, category, factor, sort_order, description) values
  ('normal_conditions',  'Normal Conditions',      'baseline',   1.0,  10, 'Baseline productivity. Factor is always 1.00.'),
  ('occupied_building',  'Occupied Building',      'site',       1.0,  20, 'Set a company-specific factor before use.'),
  ('difficult_access',   'Difficult Access',       'site',       1.0,  30, 'Set a company-specific factor before use.'),
  ('high_ceiling',       'High Ceiling',           'site',       1.0,  40, 'Set a company-specific factor before use.'),
  ('night_work',         'Night Work',             'schedule',   1.0,  50, 'Set a company-specific factor before use.'),
  ('phased_work',        'Phased Work',            'schedule',   1.0,  60, 'Set a company-specific factor before use.'),
  ('sensitive_env',      'Hospital / Sensitive Environment', 'site', 1.0, 70, 'Set a company-specific factor before use.'),
  ('roof_work',          'Roof Work',              'site',       1.0,  80, 'Set a company-specific factor before use.'),
  ('winter_conditions',  'Winter Conditions',      'seasonal',   1.0,  90, 'Set a company-specific factor before use.'),
  ('tight_mech_room',    'Tight Mechanical Room',  'site',       1.0, 100, 'Set a company-specific factor before use.'),
  ('prevailing_wage',    'Prevailing Wage Adjustment', 'commercial', 1.0, 110, 'Set a company-specific factor before use.')
on conflict (code) do nothing;

notify pgrst, 'reload schema';
