#!/usr/bin/env tsx
// Isolate why the estimating admin cannot reach Supabase.
//
// Run with:
//   npm run diagnose:db
//
// Reads the same environment the app reads, runs the simplest possible query
// against the real client, and prints the RAW, unmasked PostgREST error — the
// thing the admin pages classify away into a one-line notice.
//
// Nothing secret is printed: not the key, not the Authorization header, not the
// environment. The project ref is the public project identifier.

import {
  classifyDbError,
  estimatingDb,
  estimatingDbContext,
  EstimatingConfigError,
} from '@/lib/estimating/db';

const PROBE_TABLE = 'projects';

function section(title: string): void {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Report whitespace/quoting problems without echoing the value. */
function describeHygiene(name: string): string {
  const raw = process.env[name];
  if (raw === undefined) return 'not set';
  const notes: string[] = [`${raw.length} chars`];
  if (raw !== raw.trim()) notes.push('HAS SURROUNDING WHITESPACE');
  if (/[\r\n]/.test(raw)) notes.push('CONTAINS A NEWLINE');
  if (/^['"]|['"]$/.test(raw.trim())) notes.push('IS QUOTED');
  return notes.join(', ');
}

/**
 * Turn an HTTP status into the layer that failed.
 *
 * A status alone is not enough: a proxy, WAF or egress allowlist in front of
 * Supabase can return the same 401/403 without PostgREST ever being reached.
 * The body has to actually look like a PostgREST error before its status is
 * read as a database verdict.
 */
function interpretRest(status: number, ok: boolean, body: string): string {
  if (ok) return 'no failure at this layer.';

  let parsed: { code?: unknown; message?: unknown } | null = null;
  try {
    const value: unknown = JSON.parse(body);
    if (value && typeof value === 'object') parsed = value as { code?: unknown; message?: unknown };
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed.message !== 'string') {
    return `not a PostgREST response — something between this process and Supabase answered ${status}. Check network egress, a proxy or a WAF before suspecting the database.`;
  }

  const code = typeof parsed.code === 'string' ? parsed.code : '';
  if (status === 401) return 'A — the gateway refused the API key.';
  if (code === '42501' || /permission denied/i.test(parsed.message)) {
    return 'E — the key was accepted; Postgres refused the query. The role in use lacks table privileges (grants), or RLS blocked it.';
  }
  if (code === '42P01' || code === 'PGRST205') return 'D — the table is missing from the schema.';
  if (status === 404) return 'D — the table or schema cache entry is missing.';
  return `C — PostgREST returned ${status}${code ? ` (${code})` : ''}.`;
}

async function main(): Promise<void> {
  section('configuration');
  const context = estimatingDbContext();
  console.log(`[estimating-db] supabase project ref: ${context.projectRef ?? 'unknown'}`);
  console.log(`[estimating-db] service role configured: ${context.serviceRoleConfigured}`);
  console.log(`[estimating-db] key supplied by: ${context.serviceRoleVar ?? 'nothing'}`);
  console.log(`[estimating-db] key format: ${context.keyFormat ?? 'n/a'}`);
  console.log(`[estimating-db] key role claim: ${context.keyRole ?? 'n/a (new-format key)'}`);
  console.log(
    `[estimating-db] key project matches SUPABASE_URL: ${
      context.keyProjectMatchesUrl === null
        ? 'unknown (new-format key)'
        : context.keyProjectMatchesUrl
    }`,
  );
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    console.log(`[estimating-db] ${name}: ${describeHygiene(name)}`);
  }

  if (context.keyRole && context.keyRole !== 'service_role') {
    console.log(
      `\n!! The configured key is a "${context.keyRole}" key. The estimating tables revoke all\n` +
        '   access from anon and authenticated, so this key can never read them.',
    );
  }
  if (context.keyProjectMatchesUrl === false) {
    console.log('\n!! The key and SUPABASE_URL belong to DIFFERENT Supabase projects.');
  }

  // --- raw REST probe: the HTTP status separates auth from privileges -------
  section(`raw REST probe: GET /rest/v1/${PROBE_TABLE}?select=id&limit=1`);
  const url = readEnv('SUPABASE_URL');
  const key = readEnv(context.serviceRoleVar ?? 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.log('skipped — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not both set');
  } else {
    try {
      const response = await fetch(`${url}/rest/v1/${PROBE_TABLE}?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const body = await response.text();
      console.log(`HTTP ${response.status} ${response.statusText}`);
      console.log(`body: ${body.slice(0, 500)}`);
      console.log(`\ninterpretation: ${interpretRest(response.status, response.ok, body)}`);
    } catch (error) {
      console.log(`transport failure: ${error instanceof Error ? error.message : String(error)}`);
      console.log('interpretation: B — the URL did not resolve or the project is unreachable.');
    }
  }

  // --- the same query through the app's own client --------------------------
  section(`supabase-js probe: from('${PROBE_TABLE}').select('id').limit(1)`);
  try {
    const { data, error, status } = await estimatingDb().from(PROBE_TABLE).select('id').limit(1);

    if (error) {
      console.log('RAW PostgrestError (unmasked):');
      console.dir({ status, ...error, message: error.message }, { depth: null });
      const failure = classifyDbError(error);
      console.log(`\nclassified as: ${failure.kind}`);
      console.log(`UI would show: ${failure.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`OK — ${data?.length ?? 0} row(s) readable. The estimating admin can query.`);
  } catch (error) {
    if (error instanceof EstimatingConfigError) {
      console.log(`configuration error: ${error.message}`);
    } else {
      console.log('RAW thrown value (unmasked):');
      console.dir(error, { depth: null });
    }
    const failure = classifyDbError(error);
    console.log(`\nclassified as: ${failure.kind}`);
    console.log(`UI would show: ${failure.message}`);
    process.exitCode = 1;
  }
}

void main();
