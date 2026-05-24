import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type LeadRecord = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  service_type?: string | null;
  home_size?: string | null;
  system_age?: string | null;
  message?: string | null;
  source: string;
  preferred_contact_time?: string | null;
  city?: string | null;
  status?: string;
  notes?: string | null;
};

export const LEADS_SCHEMA_SQL = `create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text,
  email text,
  phone text,
  service_type text,
  home_size text,
  system_age text,
  message text,
  source text,
  preferred_contact_time text,
  city text,
  status text default 'new',
  notes text
);`;
