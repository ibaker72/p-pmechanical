#!/usr/bin/env tsx
// Tests for the rate limiter and the /admin sign-in flow that depends on it.
//
// Run with:
//   npm run test:ratelimit
//
// These cover the production incident in which a rate-limiter infrastructure
// failure crashed POST /admin/login with a 500:
//
//   TypeError: res.map is not a function
//       at Pipeline.exec
//       at async AutoPipelineExecutor.withAutoPipeline
//       at async Object.limit            (Ratelimit.slidingWindow)
//       at async RegionRatelimit.getRatelimitResponse
//       at async RegionRatelimit.limit
//
// @upstash/redis enables auto-pipelining by default, batching every command
// into `POST /pipeline` and then calling `.map()` on the decoded response
// without checking that it is an array. An endpoint answering 200 with a JSON
// object turns that into a TypeError thrown from inside the SDK, which used to
// propagate straight out of the server action.
//
// The suite drives the real @upstash/ratelimit + @upstash/redis stack against a
// stubbed `fetch`, so the failure modes are the SDK's own, not simulations of
// them. `next/headers` and `next/navigation` are stubbed through require.cache
// so the sign-in server action can be exercised end to end.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ADMIN_COOKIE_NAME, verifySessionToken, type AdminSession } from '@/lib/auth/admin-session';

// --- next/* stubs, installed before the app modules are imported ------------

// JSX in app/ is compiled with the classic runtime by tsx, which expects a
// global React. Only needed to render the login page component below.
(globalThis as unknown as { React: unknown }).React = require('react');

type CookieRecord = { value: string; maxAge?: number };

let cookieStore = new Map<string, CookieRecord>();
let requestHeaders = new Map<string, string>();

class NextRedirect extends Error {
  constructor(readonly url: string) {
    super('NEXT_REDIRECT');
    this.name = 'NextRedirect';
  }
}

function stubModule(specifier: string, exports: Record<string, unknown>): void {
  const filename = require.resolve(specifier);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  } as unknown as NodeModule;
}

stubModule('next/headers', {
  cookies: () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string, options?: { maxAge?: number }) =>
      cookieStore.set(name, { value, maxAge: options?.maxAge }),
  }),
  headers: () => requestHeaders,
});

stubModule('next/navigation', {
  redirect: (url: string) => {
    throw new NextRedirect(url);
  },
});

// --- test harness ----------------------------------------------------------

type TestCase = { name: string; run: () => Promise<boolean | string> | boolean | string };

const tests: TestCase[] = [];
function test(name: string, run: TestCase['run']) {
  tests.push({ name, run });
}

const SECRET = 'test-admin-secret-value-1234567890';
const REDIS_URL = 'https://test-db.upstash.io';
const REDIS_TOKEN = 'AX9sASQgZmFrZS10b2tlbi1mb3ItdGVzdHM';

const realFetch = globalThis.fetch;

/** Requests the stubbed endpoint received, newest last. */
let fetchLog: { url: string; body: unknown }[] = [];

type Responder = (url: string, command: unknown) => Response | Promise<Response>;

function installFetch(responder: Responder): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body: unknown = JSON.parse(String(init?.body ?? 'null'));
    fetchLog.push({ url, body });
    return responder(url, body);
  }) as typeof fetch;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * A stand-in for the Upstash REST endpoint, healthy enough to run the sliding
 * window script. `evalsha` answers NOSCRIPT so the SDK's real EVAL fallback is
 * exercised; everything else (analytics writes) is acknowledged.
 */
function healthyUpstash(): Responder {
  const counters = new Map<string, number>();

  const runCommand = (command: unknown): { result?: unknown; error?: string } => {
    if (!Array.isArray(command)) return { result: 1 };
    const name = String(command[0]).toLowerCase();
    if (name === 'evalsha') return { error: 'NOSCRIPT No matching script. Please use EVAL.' };
    if (name === 'eval') {
      const keyCount = Number(command[2]);
      const currentKey = String(command[3]);
      const tokens = Number(command[3 + keyCount]);
      const used = (counters.get(currentKey) ?? 0) + 1;
      if (used > tokens) return { result: [-1, tokens] }; // negative remaining => denied
      counters.set(currentKey, used);
      return { result: [tokens - used, tokens] };
    }
    return { result: 1 };
  };

  return (url, command) =>
    jsonResponse(
      url.endsWith('/pipeline') && Array.isArray(command)
        ? command.map((entry) => runCommand(entry))
        : runCommand(command),
    );
}

/** Captured console output, so failure logging can be asserted on. */
let consoleLog: string[] = [];
const realConsoleError = console.error;
const realConsoleWarn = console.warn;

function captureConsole(): void {
  console.error = (...args: unknown[]) => void consoleLog.push(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => void consoleLog.push(args.map(String).join(' '));
}

function restoreConsole(): void {
  console.error = realConsoleError;
  console.warn = realConsoleWarn;
}

type RateLimitModule = typeof import('@/lib/ratelimit');
type LoginModule = typeof import('@/app/admin/login/actions');

let rateLimitModule: RateLimitModule;
let loginModule: LoginModule;

/** Reset every piece of global state the previous case may have touched. */
function resetWorld(options: { redis: boolean }): void {
  rateLimitModule.__resetRateLimiterState();
  cookieStore = new Map();
  requestHeaders = new Map([['x-forwarded-for', '203.0.113.7']]);
  fetchLog = [];
  consoleLog = [];
  process.env.ADMIN_SECRET = SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  if (options.redis) {
    process.env.UPSTASH_REDIS_REST_URL = REDIS_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REDIS_TOKEN;
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
  installFetch(healthyUpstash());
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

test('config: with no Upstash credentials the limiter is a documented no-op', async () => {
  resetWorld({ redis: false });
  const result = await rateLimitModule.limitForm('config-none:1.1.1.1');
  return result.success && result.skipped && !result.degraded
    ? true
    : `expected a skipped pass, got ${JSON.stringify(result)}`;
});

test('config: a redis:// connection string is rejected without reaching the SDK', async () => {
  resetWorld({ redis: true });
  process.env.UPSTASH_REDIS_REST_URL = 'redis://default:pw@test-db.upstash.io:6379';
  rateLimitModule.__resetRateLimiterState();
  captureConsole();
  let result: Awaited<ReturnType<typeof rateLimitModule.limitForm>>;
  try {
    result = await rateLimitModule.limitForm('config-scheme:1.1.1.1');
  } finally {
    restoreConsole();
  }
  if (fetchLog.length > 0) return 'a request was sent to a non-REST URL';
  if (!consoleLog.join('\n').includes('[ratelimit]')) return 'the misconfiguration was not logged';
  return result.success && result.degraded && !result.skipped
    ? true
    : `expected a degraded pass, got ${JSON.stringify(result)}`;
});

test('config: a REST URL carrying a path is rejected (it is what returns 200 + an object)', async () => {
  resetWorld({ redis: true });
  process.env.UPSTASH_REDIS_REST_URL = `${REDIS_URL}/redis/v1`;
  rateLimitModule.__resetRateLimiterState();
  captureConsole();
  let result: Awaited<ReturnType<typeof rateLimitModule.limitForm>>;
  try {
    result = await rateLimitModule.limitForm('config-path:1.1.1.1');
  } finally {
    restoreConsole();
  }
  if (fetchLog.length > 0) return 'a request was sent to a URL with a path';
  return result.degraded && !result.skipped
    ? true
    : `expected a degraded decision, got ${JSON.stringify(result)}`;
});

test('config: surrounding whitespace and newlines in the credentials are tolerated', async () => {
  resetWorld({ redis: true });
  process.env.UPSTASH_REDIS_REST_URL = `  ${REDIS_URL}\n`;
  process.env.UPSTASH_REDIS_REST_TOKEN = ` ${REDIS_TOKEN} `;
  rateLimitModule.__resetRateLimiterState();
  const result = await rateLimitModule.limitForm('config-space:1.1.1.1');
  return result.success && !result.degraded && !result.skipped && fetchLog.length > 0
    ? true
    : `expected a healthy Redis decision, got ${JSON.stringify(result)}`;
});

// ---------------------------------------------------------------------------
// Redis-backed behaviour
// ---------------------------------------------------------------------------

test('limiter: a normal request is allowed and reports the Redis budget', async () => {
  resetWorld({ redis: true });
  const result = await rateLimitModule.limitForm('normal:198.51.100.1');
  return result.success &&
    !result.skipped &&
    !result.degraded &&
    result.limit === 10 &&
    result.remaining === 9
    ? true
    : `unexpected result ${JSON.stringify(result)}`;
});

test('limiter: too many attempts are rejected once the window is spent', async () => {
  resetWorld({ redis: true });
  const outcomes: boolean[] = [];
  for (let i = 0; i < 11; i += 1) {
    outcomes.push((await rateLimitModule.limitForm('burst:198.51.100.2')).success);
  }
  const allowed = outcomes.filter(Boolean).length;
  return allowed === 10 && outcomes[10] === false
    ? true
    : `expected 10 allowed then a rejection, got ${JSON.stringify(outcomes)}`;
});

test('limiter: the webhook limiter keeps its own, larger budget', async () => {
  resetWorld({ redis: true });
  const result = await rateLimitModule.limitWebhook('wh:198.51.100.3');
  return result.success && result.limit === 60 && !result.degraded
    ? true
    : `unexpected result ${JSON.stringify(result)}`;
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

test('regression: the raw SDK really does crash on a non-array pipeline response', async () => {
  resetWorld({ redis: true });
  // Auto-pipelining left at its default (on), exactly as the original code had
  // it. This pins the upstream behaviour our configuration works around.
  installFetch(() => jsonResponse({ result: null, error: null }));
  const raw = new Ratelimit({
    redis: new Redis({ url: REDIS_URL, token: REDIS_TOKEN }),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:regression',
  });
  try {
    await raw.limit('regression:198.51.100.4');
    return 'the SDK did not throw — this guard is no longer meaningful';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return error instanceof TypeError && /\.map is not a function/.test(message)
      ? true
      : `expected the pipeline TypeError, got ${message}`;
  }
});

test('failure: a malformed pipeline response degrades instead of throwing', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    // The exact production shape: HTTP 200 with a JSON object, not an array.
    installFetch(() => jsonResponse({ result: null, error: null }));
    const result = await rateLimitModule.limitForm('malformed:198.51.100.5');
    if (result.degraded && !result.skipped && result.success) return true;
    return `expected a degraded pass, got ${JSON.stringify(result)}`;
  } finally {
    restoreConsole();
  }
});

test('failure: a client/transport error degrades instead of throwing', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    const result = await rateLimitModule.limitForm('offline:198.51.100.6');
    if (result.degraded && result.success) return true;
    return `expected a degraded pass, got ${JSON.stringify(result)}`;
  } finally {
    restoreConsole();
  }
});

test('failure: an Upstash 5xx degrades instead of throwing', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => jsonResponse({ error: 'internal server error' }, 500));
    const result = await rateLimitModule.limitForm('server-error:198.51.100.7');
    if (result.degraded && result.success) return true;
    return `expected a degraded pass, got ${JSON.stringify(result)}`;
  } finally {
    restoreConsole();
  }
});

test('failure: a non-JSON (HTML) response degrades instead of throwing', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => new Response('<html><body>502 Bad Gateway</body></html>', { status: 200 }));
    const result = await rateLimitModule.limitForm('html:198.51.100.8');
    if (result.degraded && result.success) return true;
    return `expected a degraded pass, got ${JSON.stringify(result)}`;
  } finally {
    restoreConsole();
  }
});

// ---------------------------------------------------------------------------
// Degradation is not fail-open
// ---------------------------------------------------------------------------

test('degraded: brute force is still blocked while Redis is unavailable', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    const outcomes: boolean[] = [];
    for (let i = 0; i < 7; i += 1) {
      const result = await rateLimitModule.limitForm('degraded-burst:198.51.100.9');
      if (!result.degraded) return `attempt ${i} was not degraded`;
      outcomes.push(result.success);
    }
    // The in-process budget is deliberately stricter than the Redis one.
    return outcomes.filter(Boolean).length === 5 && outcomes[5] === false && outcomes[6] === false
      ? true
      : `expected 5 allowed then rejections, got ${JSON.stringify(outcomes)}`;
  } finally {
    restoreConsole();
  }
});

test('degraded: the circuit breaker stops hammering a broken Redis', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    for (let i = 0; i < 3; i += 1) await rateLimitModule.limitForm(`breaker-${i}:198.51.100.10`);
    const afterThreshold = fetchLog.length;
    if (afterThreshold === 0) return 'the limiter never contacted Redis at all';
    for (let i = 0; i < 3; i += 1) await rateLimitModule.limitForm(`breaker-x${i}:198.51.100.10`);
    return fetchLog.length === afterThreshold
      ? true
      : `the breaker stayed closed: ${afterThreshold} then ${fetchLog.length} requests`;
  } finally {
    restoreConsole();
  }
});

test('degraded: a healthy Redis is used again after the breaker closes', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    const first = await rateLimitModule.limitForm('recover:198.51.100.11');
    if (!first.degraded) return 'the first attempt should have degraded';
    installFetch(healthyUpstash());
    const second = await rateLimitModule.limitForm('recover:198.51.100.11');
    return !second.degraded && second.success
      ? true
      : `expected a healthy decision after recovery, got ${JSON.stringify(second)}`;
  } finally {
    restoreConsole();
  }
});

test('logging: limiter failures are reported without the Redis URL or token', async () => {
  resetWorld({ redis: true });
  captureConsole();
  try {
    installFetch(() => jsonResponse({ result: null, error: null }));
    await rateLimitModule.limitForm('logging:198.51.100.12');
  } finally {
    restoreConsole();
  }
  const output = consoleLog.join('\n');
  if (!output.includes('[ratelimit]')) return `nothing was logged: ${JSON.stringify(consoleLog)}`;
  if (output.includes(REDIS_TOKEN)) return 'the Redis token was written to the logs';
  if (output.includes(REDIS_URL)) return 'the Redis URL was written to the logs';
  return true;
});

// ---------------------------------------------------------------------------
// The sign-in flow
// ---------------------------------------------------------------------------

/** Run the sign-in action and normalise its redirect-by-throw into a result. */
async function signIn(
  password: string,
  next?: string,
): Promise<{ redirectedTo?: string; error?: string; threw?: Error }> {
  const formData = new FormData();
  formData.set('password', password);
  formData.set('next', next ?? '');
  try {
    const result = await loginModule.loginAction(null, formData);
    return { error: result && result.ok === false ? result.error : undefined };
  } catch (error) {
    if (error instanceof NextRedirect) return { redirectedTo: error.url };
    return { threw: error as Error };
  }
}

async function currentSession(): Promise<AdminSession | null> {
  return verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

test('login: a valid secret signs in while the limiter is healthy', async () => {
  resetWorld({ redis: true });
  const outcome = await signIn(SECRET);
  if (outcome.threw) return `the action threw: ${outcome.threw.message}`;
  if (outcome.redirectedTo !== '/admin') return `redirected to ${outcome.redirectedTo}`;
  const session = await currentSession();
  return session?.sub === 'owner'
    ? true
    : `no valid session was created: ${JSON.stringify(session)}`;
});

test('login: a wrong password is rejected and creates no session', async () => {
  resetWorld({ redis: true });
  const outcome = await signIn('not-the-admin-password-at-all');
  if (outcome.threw) return `the action threw: ${outcome.threw.message}`;
  if (outcome.redirectedTo) return 'a wrong password produced a redirect';
  const session = await currentSession();
  return outcome.error === 'That password is not correct.' && session === null
    ? true
    : `unexpected outcome ${JSON.stringify(outcome)}`;
});

test('login: repeated wrong guesses are rate limited, not just rejected', async () => {
  resetWorld({ redis: true });
  const errors: (string | undefined)[] = [];
  for (let i = 0; i < 11; i += 1) errors.push((await signIn('wrong-guess-number-' + i)).error);
  return errors[10] === 'Too many sign-in attempts. Wait a minute and try again.'
    ? true
    : `the 11th guess was not throttled: ${JSON.stringify(errors.slice(9))}`;
});

test('login: a limiter backend failure does not produce a 500', async () => {
  resetWorld({ redis: true });
  captureConsole();
  let outcome: Awaited<ReturnType<typeof signIn>>;
  try {
    installFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    outcome = await signIn(SECRET);
  } finally {
    restoreConsole();
  }
  if (outcome.threw) return `the action threw a 500: ${outcome.threw.message}`;
  if (outcome.redirectedTo !== '/admin') return `redirected to ${outcome.redirectedTo}`;
  const session = await currentSession();
  return session !== null ? true : 'no session was created during degraded operation';
});

test('login: the exact production crash shape does not produce a 500', async () => {
  resetWorld({ redis: true });
  captureConsole();
  let outcome: Awaited<ReturnType<typeof signIn>>;
  try {
    // 200 + a JSON object: the response that produced
    // `TypeError: s.map is not a function` inside Pipeline.exec.
    installFetch(() => jsonResponse({ result: null, error: null }));
    outcome = await signIn(SECRET);
  } finally {
    restoreConsole();
  }
  if (outcome.threw) return `the action threw a 500: ${outcome.threw.message}`;
  return outcome.redirectedTo === '/admin' ? true : `redirected to ${outcome.redirectedTo}`;
});

test('login: brute force is still throttled while the limiter is degraded', async () => {
  resetWorld({ redis: true });
  captureConsole();
  const errors: (string | undefined)[] = [];
  try {
    installFetch(() => Promise.reject(new Error('ECONNREFUSED')));
    for (let i = 0; i < 6; i += 1) errors.push((await signIn('wrong-guess-' + i)).error);
  } finally {
    restoreConsole();
  }
  return errors[5] === 'Too many sign-in attempts. Wait a minute and try again.'
    ? true
    : `degraded brute-force protection did not engage: ${JSON.stringify(errors)}`;
});

test('login: only in-app paths are honoured for the post-sign-in redirect', async () => {
  resetWorld({ redis: true });
  const outcome = await signIn(SECRET, 'https://evil.example.com/admin');
  return outcome.redirectedTo === '/admin'
    ? true
    : `an external redirect was accepted: ${outcome.redirectedTo}`;
});

// ---------------------------------------------------------------------------
// End-to-end: the production flow that was crashing
// ---------------------------------------------------------------------------

test('flow: GET /admin/login renders, POST of a valid secret creates a session and redirects', async () => {
  resetWorld({ redis: true });

  // GET /admin/login — signed out, so the page renders rather than redirecting.
  const { default: AdminLoginPage } = await import('@/app/admin/login/page');
  let rendered: unknown;
  try {
    rendered = await AdminLoginPage({ searchParams: {} });
  } catch (error) {
    return `GET /admin/login did not return 200: ${(error as Error).message}`;
  }
  if (!rendered || typeof rendered !== 'object') return 'the login page rendered nothing';

  // POST the correct secret — the limiter runs, then the session is issued.
  const outcome = await signIn(SECRET, '/admin');
  if (outcome.threw) return `POST /admin/login returned a 500: ${outcome.threw.message}`;
  if (outcome.redirectedTo !== '/admin') return `redirected to ${outcome.redirectedTo}`;

  const limiterRan = fetchLog.some(
    (entry) => Array.isArray(entry.body) && /^eval(sha)?$/i.test(String(entry.body[0])),
  );
  if (!limiterRan) return 'the rate limiter never ran against Redis';

  const session = await currentSession();
  if (session?.sub !== 'owner') return 'no valid admin session was created';

  // GET /admin/login again — now signed in, so it redirects into the admin.
  try {
    await AdminLoginPage({ searchParams: {} });
    return 'a signed-in visit to /admin/login did not redirect';
  } catch (error) {
    return error instanceof NextRedirect && error.url === '/admin'
      ? true
      : `unexpected redirect target: ${(error as Error).message}`;
  }
});

// ---------------------------------------------------------------------------

async function main() {
  rateLimitModule = await import('@/lib/ratelimit');
  loginModule = await import('@/app/admin/login/actions');

  let passed = 0;
  const failures: string[] = [];

  for (const testCase of tests) {
    let result: boolean | string;
    try {
      result = await testCase.run();
    } catch (error) {
      restoreConsole();
      result = `threw ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`;
    }
    if (result === true) passed += 1;
    else
      failures.push(`  ✗ ${testCase.name}${typeof result === 'string' ? `\n      ${result}` : ''}`);
  }

  globalThis.fetch = realFetch;
  console.log(`\n[test-ratelimit] ${passed}/${tests.length} passed`);
  if (failures.length > 0) {
    console.error(`\n${failures.join('\n')}\n`);
    process.exit(1);
  }
  process.exit(0);
}

void main();
