-- 002_geo_pages_content.sql
-- Adds content + FAQ storage to the existing public.geo_pages table so the
-- AI-generated landing pages can render directly from the row. Safe to re-run.

alter table public.geo_pages
  add column if not exists page_content_html text,
  add column if not exists faq_json jsonb not null default '[]'::jsonb;

create index if not exists geo_pages_updated_at_idx
  on public.geo_pages (updated_at desc);

comment on column public.geo_pages.page_content_html is
  'Deterministic HTML body assembled from sanitized AI-generated sections. Never written by the model directly.';
comment on column public.geo_pages.faq_json is
  'Array of {question, answer} entries used for both rendering and FAQPage JSON-LD.';

notify pgrst, 'reload schema';
