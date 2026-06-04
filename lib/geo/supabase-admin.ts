// Dedicated Supabase service-role client for the AI geo_pages write path.
//
// Why a second client instead of reusing lib/supabase.ts?
//   - We want to support env-name aliases (some hosts label the key
//     SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE).
//   - We re-create the client every call so a cold-start cache can never
//     hold a stale key from a previous deploy.
//   - We pass apikey + Authorization headers explicitly so the request is
//     unambiguously authenticated as service_role at PostgREST — this is
//     what makes the role bypass RLS on geo_pages.
//
// Importantly: this module is server-only. The key is read from
// process.env at call time and is NEVER logged or returned to clients.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type GeoClientFailure =
  | { stage: 'supabase_config'; error: 'missing_service_role_key' }
  | { stage: 'supabase_config'; error: 'missing_supabase_url' };

export type GeoClientResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; failure: GeoClientFailure };

export type GeoEnvDiagnostics = {
  supabase_url_present: boolean;
  service_role_key_present: boolean;
  service_role_env_var_used: string | null;
};

const SERVICE_ROLE_KEY_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SERVICE_ROLE',
] as const;

function readServiceRoleKey(): { key: string; varName: string } | null {
  for (const name of SERVICE_ROLE_KEY_VARS) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return { key: value, varName: name };
  }
  return null;
}

export function getGeoEnvDiagnostics(): GeoEnvDiagnostics {
  const url = process.env.SUPABASE_URL;
  const found = readServiceRoleKey();
  return {
    supabase_url_present: !!url && url.trim().length > 0,
    service_role_key_present: !!found,
    service_role_env_var_used: found?.varName ?? null,
  };
}

export function getGeoServiceClient(): GeoClientResult {
  const url = process.env.SUPABASE_URL;
  if (!url || !url.trim()) {
    return { ok: false, failure: { stage: 'supabase_config', error: 'missing_supabase_url' } };
  }
  const found = readServiceRoleKey();
  if (!found) {
    return {
      ok: false,
      failure: { stage: 'supabase_config', error: 'missing_service_role_key' },
    };
  }

  // Belt-and-suspenders: pass the key as both the supabaseKey argument AND in
  // the global headers. Without explicit headers, some edge runtimes have been
  // observed to drop apikey on POST requests, which makes PostgREST fall back
  // to anon and surface "permission denied for table" against RLS-enabled
  // tables.
  const client = createClient(url, found.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: found.key,
        Authorization: `Bearer ${found.key}`,
      },
    },
  });

  return { ok: true, client };
}
