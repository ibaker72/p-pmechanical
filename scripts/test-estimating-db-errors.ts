#!/usr/bin/env tsx
// Tests for how Supabase failures are classified and logged.
//
// Run with:
//   npm run test:db-errors
//
// Context: /admin/projects returned HTTP 200 rendering "The estimating database
// is not ready. The database rejected the request. Check that
// SUPABASE_SERVICE_ROLE_KEY is the project service-role key." Vercel showed no
// error entry, because every admin page caught its error, rendered the fallback
// and dropped the error object. The underlying failure was
// `42501 permission denied for table projects` — the key was fine, the
// service_role grants were not — and the UI blamed the wrong thing.
//
// These tests pin two properties:
//   1. Each distinct failure is classified as itself, so the notice points at
//      the right fix.
//   2. The real error is always written to the server log, and never with a
//      secret in it.

import {
  classifyDbError,
  EstimatingConfigError,
  logDbError,
  readLegacyKeyClaims,
  reportDbFailure,
  supabaseKeyFormat,
  supabaseProjectRef,
  type DbFailureKind,
} from '@/lib/estimating/db';

type TestCase = { name: string; run: () => Promise<boolean | string> | boolean | string };

const tests: TestCase[] = [];
function test(name: string, run: TestCase['run']) {
  tests.push({ name, run });
}

/** Build a PostgREST-shaped error the way supabase-js surfaces one. */
function postgrest(fields: {
  code: string;
  message: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
}) {
  return Object.assign(new Error(fields.message), {
    name: 'PostgrestError',
    code: fields.code,
    details: fields.details ?? null,
    hint: fields.hint ?? null,
    ...(fields.status === undefined ? {} : { status: fields.status }),
  });
}

let captured: unknown[][] = [];
const realConsoleError = console.error;

function capture(): void {
  captured = [];
  console.error = (...args: unknown[]) => void captured.push(args);
}
function release(): void {
  console.error = realConsoleError;
}

function expectKind(error: unknown, kind: DbFailureKind): boolean | string {
  const actual = classifyDbError(error).kind;
  return actual === kind ? true : `classified as "${actual}", expected "${kind}"`;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

test('missing env is a configuration failure', () =>
  expectKind(
    new EstimatingConfigError(
      'The estimating database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    ),
    'not-configured',
  ));

test('a configuration failure names both env vars in the UI message', () => {
  const { message } = classifyDbError(new EstimatingConfigError('nope'));
  return message.includes('SUPABASE_URL') && message.includes('SUPABASE_SERVICE_ROLE_KEY')
    ? true
    : message;
});

test('an invalid API key is a credential failure', () =>
  expectKind(
    postgrest({
      code: '401',
      message: 'Invalid API key',
      hint: 'Double check your Supabase `anon` or `service_role` API key.',
      status: 401,
    }),
    'invalid-credentials',
  ));

test('an expired JWT is a credential failure', () =>
  expectKind(postgrest({ code: 'PGRST301', message: 'JWT expired' }), 'invalid-credentials'));

test('a 401 with no recognisable text is still a credential failure', () =>
  expectKind(postgrest({ code: '', message: 'unauthorized', status: 401 }), 'invalid-credentials'));

test('the production failure — 42501 — is a privileges failure, not a credential one', () =>
  expectKind(
    postgrest({ code: '42501', message: 'permission denied for table projects', status: 403 }),
    'insufficient-privileges',
  ));

test('42501 no longer tells the operator the key is wrong', () => {
  // The old message was "Check that SUPABASE_SERVICE_ROLE_KEY is the project
  // service-role key" — which sent the investigation to Vercel when the fault
  // was in Postgres grants.
  const { message } = classifyDbError(
    postgrest({ code: '42501', message: 'permission denied for table projects' }),
  );
  return /grants|privileges/i.test(message) && message.includes('service_role')
    ? true
    : `the message does not mention grants: ${message}`;
});

test('an RLS refusal is reported as a privileges failure', () =>
  expectKind(
    postgrest({
      code: '42501',
      message: 'new row violates row-level security policy for table "projects"',
    }),
    'insufficient-privileges',
  ));

test('a missing relation is a schema failure', () =>
  expectKind(
    postgrest({ code: '42P01', message: 'relation "public.projects" does not exist' }),
    'missing-relation',
  ));

test('a stale PostgREST schema cache is a schema failure', () =>
  expectKind(
    postgrest({
      code: 'PGRST205',
      message: "Could not find the table 'public.projects' in the schema cache",
    }),
    'missing-relation',
  ));

test('a schema failure points at the migrations', () => {
  const { message } = classifyDbError(postgrest({ code: '42P01', message: 'relation missing' }));
  return message.includes('migrations 003-005') ? true : message;
});

test('a transport failure is a network failure', () =>
  expectKind(
    Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND db.example.supabase.co'), {
        code: 'ENOTFOUND',
      }),
    }),
    'network',
  ));

test('a refused connection is a network failure', () =>
  expectKind(
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), { code: 'ECONNREFUSED' }),
    'network',
  ));

test('an aborted request is a network failure', () =>
  expectKind(
    Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    'network',
  ));

test('an unrecognised PostgREST error is a generic database failure', () =>
  expectKind(
    postgrest({ code: '22P02', message: 'invalid input syntax for type uuid: "not-a-uuid"' }),
    'database',
  ));

test('a generic database message leaks no schema internals', () => {
  const { message } = classifyDbError(
    postgrest({
      code: '22P02',
      message: 'invalid input syntax for type uuid: "not-a-uuid"',
      details: 'column projects.id',
    }),
  );
  return !message.includes('projects') && !message.includes('uuid')
    ? true
    : `the UI message leaks internals: ${message}`;
});

test('success: a null error is never classified as a failure by the caller', () => {
  // The read paths only classify what they caught, so this asserts the shape a
  // successful query takes: no throw, nothing to classify.
  let threw = false;
  try {
    const { data, error } = { data: [{ id: 'abc' }], error: null } as {
      data: { id: string }[] | null;
      error: unknown;
    };
    if (error) throw error;
    threw = data === null;
  } catch {
    threw = true;
  }
  return threw === false ? true : 'a successful response was treated as an error';
});

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

test('a failure is logged with code, message, details and hint', () => {
  capture();
  try {
    reportDbFailure(
      'listProjects',
      postgrest({
        code: '42501',
        message: 'permission denied for table projects',
        details: 'some detail',
        hint: 'some hint',
        status: 403,
      }),
    );
  } finally {
    release();
  }
  if (captured.length === 0) return 'nothing was logged';
  const [label, payload] = captured[0] as [string, Record<string, unknown>];
  if (!label.includes('listProjects')) return `the log did not name the operation: ${label}`;
  const missing = (['code', 'message', 'details', 'hint', 'status'] as const).filter(
    (field) => payload?.[field] === undefined,
  );
  return missing.length === 0 ? true : `missing log fields: ${missing.join(', ')}`;
});

test('the log records the classified kind and the project ref', () => {
  process.env.SUPABASE_URL = 'https://kngeuujoxsiqcaiukben.supabase.co';
  capture();
  try {
    reportDbFailure('listProjects', postgrest({ code: '42501', message: 'permission denied' }));
  } finally {
    release();
  }
  const payload = (captured[0] as [string, Record<string, unknown>])[1];
  return payload.kind === 'insufficient-privileges' && payload.projectRef === 'kngeuujoxsiqcaiukben'
    ? true
    : JSON.stringify(payload);
});

test('the service-role key is never written to the log', () => {
  const key = 'super-secret-service-role-key-value';
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  capture();
  try {
    // An error that echoes the key back, the worst realistic case.
    logDbError('listProjects', postgrest({ code: 'XX000', message: `bad key ${key} rejected` }));
  } finally {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    release();
  }
  const serialised = JSON.stringify(captured);
  return !serialised.includes(key) && serialised.includes('[redacted]')
    ? true
    : 'the service-role key reached the log';
});

test('reportDbFailure returns the same message the classifier produces', () => {
  const error = postgrest({ code: '42P01', message: 'relation "projects" does not exist' });
  capture();
  let returned;
  try {
    returned = reportDbFailure('listProjects', error);
  } finally {
    release();
  }
  const expected = classifyDbError(error);
  return returned.kind === expected.kind && returned.message === expected.message
    ? true
    : JSON.stringify(returned);
});

// ---------------------------------------------------------------------------
// Configuration inspection
// ---------------------------------------------------------------------------

test('the project ref is parsed out of a Supabase URL', () =>
  supabaseProjectRef('https://kngeuujoxsiqcaiukben.supabase.co') === 'kngeuujoxsiqcaiukben'
    ? true
    : String(supabaseProjectRef('https://kngeuujoxsiqcaiukben.supabase.co')));

test('a custom domain yields no project ref rather than a wrong one', () =>
  supabaseProjectRef('https://db.example.com') === null ? true : 'a custom domain produced a ref');

test('key formats are told apart', () => {
  const legacy =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwicmVmIjoiYWJjIn0.sig';
  const checks: [string, string][] = [
    [supabaseKeyFormat(legacy), 'legacy-jwt'],
    [supabaseKeyFormat('sb_secret_abc123'), 'secret'],
    [supabaseKeyFormat('sb_publishable_abc123'), 'publishable'],
    [supabaseKeyFormat('not-a-key'), 'unknown'],
  ];
  const bad = checks.find(([actual, expected]) => actual !== expected);
  return bad ? `got "${bad[0]}", expected "${bad[1]}"` : true;
});

test('a legacy JWT key reveals its role claim without exposing the key', () => {
  // {"role":"anon","ref":"abc"} — an anon key pasted into the service-role slot
  // is the failure this check exists to catch.
  const payload = Buffer.from(JSON.stringify({ role: 'anon', ref: 'abc' })).toString('base64url');
  const claims = readLegacyKeyClaims(`eyJhbGciOiJIUzI1NiJ9.${payload}.signature`);
  return claims?.role === 'anon' && claims.ref === 'abc' ? true : JSON.stringify(claims);
});

test('a new-format secret key has no readable claims', () =>
  readLegacyKeyClaims('sb_secret_abc123') === null ? true : 'claims were read from a secret key');

// ---------------------------------------------------------------------------

async function main() {
  let passed = 0;
  const failures: string[] = [];

  for (const testCase of tests) {
    let result: boolean | string;
    try {
      result = await testCase.run();
    } catch (error) {
      release();
      result = `threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
    }
    if (result === true) passed += 1;
    else
      failures.push(`  ✗ ${testCase.name}${typeof result === 'string' ? `\n      ${result}` : ''}`);
  }

  console.log(`\n[test-estimating-db-errors] ${passed}/${tests.length} passed`);
  if (failures.length > 0) {
    console.error(`\n${failures.join('\n')}\n`);
    process.exit(1);
  }
  process.exit(0);
}

void main();
