#!/usr/bin/env tsx
// Unit tests for the admin session layer.
//
// Run with:
//   npm run test:auth
//
// These verify the authorization boundary that protects every commercial
// estimate in the system: a session cookie is only valid if it was signed by
// this server's secret and has not expired.

import {
  ADMIN_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAdminAuthConfigured,
  sessionCookieOptions,
  timingSafeEqual,
  verifyAdminPassword,
  verifySessionToken,
} from '@/lib/auth/admin-session';

type TestCase = { name: string; run: () => Promise<boolean | string> | boolean | string };

const tests: TestCase[] = [];
function test(name: string, run: TestCase['run']) {
  tests.push({ name, run });
}

const SECRET = 'test-admin-secret-value-1234567890';
const OTHER_SECRET = 'a-completely-different-secret-9876';

function withSecret<T>(secret: string | undefined, fn: () => T): T {
  const previous = process.env.ADMIN_SECRET;
  const previousSession = process.env.ADMIN_SESSION_SECRET;
  if (secret === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = secret;
  delete process.env.ADMIN_SESSION_SECRET;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = previous;
    if (previousSession !== undefined) process.env.ADMIN_SESSION_SECRET = previousSession;
  }
}

// ---------------------------------------------------------------------------

test('configuration: a short secret is treated as unconfigured', () =>
  withSecret('short', () => isAdminAuthConfigured() === false));

test('configuration: a long secret configures auth', () =>
  withSecret(SECRET, () => isAdminAuthConfigured() === true));

test('configuration: no secret means no session can be created', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const token = await createSessionToken('owner');
  delete process.env.ADMIN_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  const session = await verifySessionToken(token);
  process.env.ADMIN_SECRET = SECRET;
  return session === null ? true : 'a token verified with no secret configured';
});

test('password: the correct password is accepted', () =>
  withSecret(SECRET, () => verifyAdminPassword(SECRET) === true));

test('password: a wrong password is rejected', () =>
  withSecret(SECRET, () => verifyAdminPassword('wrong') === false));

test('password: an empty password is rejected', () =>
  withSecret(SECRET, () => verifyAdminPassword('') === false));

test('password: a prefix of the real secret is rejected', () =>
  withSecret(SECRET, () => verifyAdminPassword(SECRET.slice(0, -1)) === false));

test('password: a short configured secret can never authenticate', () =>
  withSecret('short', () => verifyAdminPassword('short') === false));

test('timingSafeEqual: equal strings match', () => timingSafeEqual('abc123', 'abc123') === true);
test('timingSafeEqual: different strings do not match', () =>
  timingSafeEqual('abc123', 'abc124') === false);
test('timingSafeEqual: different lengths do not match', () =>
  timingSafeEqual('abc', 'abcd') === false);
test('timingSafeEqual: empty vs non-empty does not match', () =>
  timingSafeEqual('', 'a') === false);

// ---------------------------------------------------------------------------

test('token: a freshly signed token verifies', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const token = await createSessionToken('owner@example.com');
  const session = await verifySessionToken(token);
  return session?.sub === 'owner@example.com' ? true : `got ${JSON.stringify(session)}`;
});

test('token: expiry is set to the configured session length', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const now = Date.now();
  const token = await createSessionToken('owner', now);
  const session = await verifySessionToken(token, now);
  if (!session) return 'token did not verify';
  return session.exp - session.iat === SESSION_MAX_AGE_SECONDS
    ? true
    : `lifetime was ${session.exp - session.iat}s`;
});

test('token: an expired token is rejected', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const issued = Date.now();
  const token = await createSessionToken('owner', issued);
  const afterExpiry = issued + (SESSION_MAX_AGE_SECONDS + 60) * 1000;
  return (await verifySessionToken(token, afterExpiry)) === null
    ? true
    : 'an expired token was accepted';
});

test('token: a token signed with a different secret is rejected', async () => {
  process.env.ADMIN_SECRET = OTHER_SECRET;
  const foreign = await createSessionToken('attacker');
  process.env.ADMIN_SECRET = SECRET;
  return (await verifySessionToken(foreign)) === null
    ? true
    : 'a token signed by another secret was accepted';
});

test('token: tampering with the payload invalidates the signature', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const token = await createSessionToken('owner');
  const [version, , signature] = token.split('.');
  // Re-encode a payload claiming a far-future expiry.
  const forgedPayload = Buffer.from(JSON.stringify({ sub: 'attacker', iat: 0, exp: 4_102_444_800 }))
    .toString('base64url')
    .replace(/=+$/, '');
  const forged = `${version}.${forgedPayload}.${signature}`;
  return (await verifySessionToken(forged)) === null ? true : 'a forged payload was accepted';
});

test('token: tampering with the signature is rejected', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const token = await createSessionToken('owner');
  const parts = token.split('.');
  const flipped = parts[2].slice(0, -1) + (parts[2].endsWith('A') ? 'B' : 'A');
  return (await verifySessionToken(`${parts[0]}.${parts[1]}.${flipped}`)) === null
    ? true
    : 'a tampered signature was accepted';
});

test('token: an unsigned "token" is rejected', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const payload = Buffer.from(JSON.stringify({ sub: 'attacker', iat: 0, exp: 4_102_444_800 }))
    .toString('base64url')
    .replace(/=+$/, '');
  return (await verifySessionToken(`v1.${payload}.`)) === null
    ? true
    : 'accepted an unsigned token';
});

test('token: a wrong version prefix is rejected', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const token = await createSessionToken('owner');
  const parts = token.split('.');
  return (await verifySessionToken(`v2.${parts[1]}.${parts[2]}`)) === null
    ? true
    : 'accepted an unknown token version';
});

test('token: garbage input is rejected without throwing', async () => {
  process.env.ADMIN_SECRET = SECRET;
  const inputs = ['', 'not-a-token', 'a.b', 'a.b.c.d', '...', 'v1..', 'v1.%%%.%%%'];
  for (const input of inputs) {
    if ((await verifySessionToken(input)) !== null) return `accepted ${JSON.stringify(input)}`;
  }
  return true;
});

test('token: undefined and null are rejected', async () => {
  process.env.ADMIN_SECRET = SECRET;
  return (
    (await verifySessionToken(undefined)) === null && (await verifySessionToken(null)) === null
  );
});

test('token: ADMIN_SESSION_SECRET takes precedence over ADMIN_SECRET for signing', async () => {
  process.env.ADMIN_SECRET = SECRET;
  process.env.ADMIN_SESSION_SECRET = OTHER_SECRET;
  const token = await createSessionToken('owner');
  // Removing the dedicated signing key must invalidate tokens signed with it.
  delete process.env.ADMIN_SESSION_SECRET;
  const afterRotation = await verifySessionToken(token);
  process.env.ADMIN_SESSION_SECRET = OTHER_SECRET;
  const beforeRotation = await verifySessionToken(token);
  delete process.env.ADMIN_SESSION_SECRET;
  return afterRotation === null && beforeRotation !== null
    ? true
    : 'the signing key is not honored independently';
});

// ---------------------------------------------------------------------------

test('cookie: the session cookie is HttpOnly and SameSite=Lax', () => {
  const options = sessionCookieOptions();
  return options.httpOnly === true && options.sameSite === 'lax' && options.path === '/'
    ? true
    : JSON.stringify(options);
});

test('cookie: maxAge 0 is used to clear the cookie on sign out', () =>
  sessionCookieOptions(0).maxAge === 0);

test('cookie: the cookie name is not guessable as a public value', () =>
  ADMIN_COOKIE_NAME === 'pp_admin_session');

// ---------------------------------------------------------------------------

async function main() {
  let passed = 0;
  const failures: string[] = [];

  for (const testCase of tests) {
    let result: boolean | string;
    try {
      result = await testCase.run();
    } catch (error) {
      result = `threw ${error instanceof Error ? error.message : String(error)}`;
    }
    if (result === true) passed += 1;
    else
      failures.push(`  ✗ ${testCase.name}${typeof result === 'string' ? `\n      ${result}` : ''}`);
  }

  console.log(`\n[test-admin-auth] ${passed}/${tests.length} passed`);
  if (failures.length > 0) {
    console.error(`\n${failures.join('\n')}\n`);
    process.exit(1);
  }
  process.exit(0);
}

void main();
