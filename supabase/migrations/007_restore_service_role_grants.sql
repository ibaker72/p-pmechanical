-- 007_restore_service_role_grants.sql
--
-- Fixes: /admin/* renders "The estimating database is not ready" because every
-- query fails with `42501 permission denied for table <name>`.
--
-- Cause
-- -----
-- The whole application reaches Postgres as `service_role` (SUPABASE_SERVICE_ROLE_KEY).
-- That role has BYPASSRLS, which is why migrations 001-005 rely on RLS plus
-- `revoke all ... from anon, authenticated` and never grant anything explicitly.
--
-- BYPASSRLS is not a table privilege. It exempts a role from row-level security
-- policies; it does not grant SELECT/INSERT/UPDATE/DELETE. Those come from
-- Supabase's stock default privileges:
--
--     alter default privileges in schema public
--       grant all on tables to anon, authenticated, service_role;
--
-- In this project that default was narrowed at some point to exclude the four
-- DML privileges, leaving:
--
--     postgres=arwdDxtm/postgres, anon=Dxtm/postgres,
--     authenticated=Dxtm/postgres, service_role=Dxtm/postgres
--
-- `a`, `r`, `w` and `d` (INSERT, SELECT, UPDATE, DELETE) are missing for
-- service_role. Every table created after that change — all of the estimating
-- tables, plus leads — came up unreadable by the server, while `geo_pages`,
-- created earlier, kept working. Nothing in this repository's migrations makes
-- that change; it was applied to the database out of band.
--
-- This migration restores DML for service_role on the existing objects and
-- repairs the default so tables added later are not born broken.
--
-- Deliberately NOT changed: anon and authenticated keep exactly the access they
-- have today. Migrations 003-005 revoke them from the estimating tables on
-- purpose, and `geo_pages` keeps its policy-scoped public read. This migration
-- only restores the server role.
--
-- Safe to re-run: GRANT and ALTER DEFAULT PRIVILEGES are both idempotent.
-- Run as the `postgres` role (the Supabase SQL editor and the CLI both do).

-- ---------------------------------------------------------------------------
-- 1. Existing objects
-- ---------------------------------------------------------------------------
grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

-- No sequences exist today (every primary key is a uuid), but a future serial
-- column would hit exactly the same wall without this.
grant usage, select
  on all sequences in schema public
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Objects created from here on
-- ---------------------------------------------------------------------------
-- Without this, the next `create table` in schema public repeats the outage.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

-- ---------------------------------------------------------------------------
-- 3. Verify
-- ---------------------------------------------------------------------------
-- Expect every row to report `true`:
--
--   select c.relname,
--          has_table_privilege('service_role', 'public.' || quote_ident(c.relname), 'SELECT')
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind in ('r', 'v')
--    order by 1;
--
-- And that anon is still shut out of the estimating tables:
--
--   select has_table_privilege('anon', 'public.projects', 'SELECT');  -- false

notify pgrst, 'reload schema';
