-- 006_estimating_hardening.sql
-- Hardening pass following a production readiness review.
--
-- Supabase's database linter flags `public.set_updated_at` with
-- "Function Search Path Mutable" (lint 0011). The function is SECURITY INVOKER,
-- so the practical risk is low, but a trigger function with an unpinned
-- search_path can be influenced by whatever search_path the calling role has
-- set. Pinning it is free and removes the warning.
--
-- Safe to re-run. CREATE OR REPLACE keeps every existing trigger binding
-- intact; no table, trigger or row is touched.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- Empty search_path: every referenced object must be schema-qualified below.
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at on modified rows. search_path is pinned to empty and now() is schema-qualified (see Supabase lint 0011).';

notify pgrst, 'reload schema';
