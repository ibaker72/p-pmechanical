// Server-only Supabase access for the AI-generated geo_pages table.
// Uses the existing service-role client. RLS lets anon read published rows;
// only the service role can write.

import { getServiceSupabase } from '@/lib/supabase';
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

export async function upsertGeoPage(input: GeoPageUpsert): Promise<{
  ok: boolean;
  row?: GeoPageRow;
  error?: string;
}> {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false, error: 'supabase_unconfigured' };

  const published_at = input.is_published ? new Date().toISOString() : null;

  const { data, error } = await supabase
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

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data as GeoPageRow };
}

export async function getPublishedGeoPageBySlug(slug: string): Promise<GeoPageRow | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
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
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('geo_pages')
    .select('slug, city, state, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data as Pick<GeoPageRow, 'slug' | 'city' | 'state' | 'updated_at'>[];
}
