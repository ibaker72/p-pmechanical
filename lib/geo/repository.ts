// Server-only Supabase access for the AI-generated geo_pages table.
//
// Writes (upsert) use the dedicated service-role client from
// lib/geo/supabase-admin.ts, which is re-created per call and sets explicit
// apikey + Authorization headers so PostgREST recognizes the role and
// bypasses RLS on geo_pages.
//
// Reads use the same admin client server-side. Public read for /locations
// rendering also works against the published rows because the RLS policy
// `geo_pages public read published` allows anon to SELECT where
// is_published = true — but the renderer calls this module server-side, so
// it uses the admin client either way.

import { getGeoServiceClient, getGeoEnvDiagnostics } from './supabase-admin';
import type { FaqEntry } from './build-location-html';

export type GeoPageRow = {
  id: string;
  slug: string;
  city: string;
  state: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  intro_copy: string | null;
  service_focus: string | null;
  page_content_html: string | null;
  faq_json: FaqEntry[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GeoPageUpsert = {
  slug: string;
  city: string;
  state: string;
  title: string;
  meta_description: string;
  h1: string;
  intro_copy: string;
  service_focus: string;
  page_content_html: string;
  faq_json: FaqEntry[];
  is_published: boolean;
};

export type UpsertResult =
  | { ok: true; row: GeoPageRow }
  | {
      ok: false;
      stage: 'supabase_config' | 'supabase_write';
      error: string;
      hint?: string;
      diagnostics?: ReturnType<typeof getGeoEnvDiagnostics>;
    };

export async function upsertGeoPage(input: GeoPageUpsert): Promise<UpsertResult> {
  const result = getGeoServiceClient();
  if (!result.ok) {
    return {
      ok: false,
      stage: result.failure.stage,
      error: result.failure.error,
      diagnostics: getGeoEnvDiagnostics(),
    };
  }

  const published_at = input.is_published ? new Date().toISOString() : null;

  const { data, error } = await result.client
    .from('geo_pages')
    .upsert(
      {
        slug: input.slug,
        city: input.city,
        state: input.state,
        title: input.title,
        meta_description: input.meta_description,
        h1: input.h1,
        intro_copy: input.intro_copy,
        service_focus: input.service_focus,
        page_content_html: input.page_content_html,
        faq_json: input.faq_json,
        is_published: input.is_published,
        ...(published_at ? { published_at } : {}),
      },
      { onConflict: 'slug' },
    )
    .select('*')
    .single();

  if (error) {
    const msg = error.message || 'unknown_db_error';
    // PostgREST surfaces RLS denials and missing GRANTs both as
    // "permission denied". Surface a hint so the operator knows where to
    // look — without exposing the key.
    const hint = /permission denied/i.test(msg)
      ? 'PostgREST returned permission denied. This means the request reached Supabase but was NOT authenticated as service_role. Re-check that SUPABASE_SERVICE_ROLE_KEY in Vercel is the project\'s service_role key (starts with eyJ... and the JWT role claim is "service_role"), not the anon key.'
      : undefined;
    return {
      ok: false,
      stage: 'supabase_write',
      error: msg,
      hint,
      diagnostics: getGeoEnvDiagnostics(),
    };
  }

  return { ok: true, row: data as GeoPageRow };
}

export async function getPublishedGeoPageBySlug(slug: string): Promise<GeoPageRow | null> {
  const result = getGeoServiceClient();
  if (!result.ok) return null;

  const { data, error } = await result.client
    .from('geo_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as GeoPageRow;
}

export async function listPublishedGeoPages(): Promise<
  Pick<GeoPageRow, 'slug' | 'city' | 'state' | 'updated_at'>[]
> {
  const result = getGeoServiceClient();
  if (!result.ok) return [];

  const { data, error } = await result.client
    .from('geo_pages')
    .select('slug, city, state, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data as Pick<GeoPageRow, 'slug' | 'city' | 'state' | 'updated_at'>[];
}
