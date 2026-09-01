import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting + idempotency, backed by Upstash Redis over its REST API.
//
// Design rule: **a limiter failure must never become a 5xx.** Every entry point
// here is total — it either returns a decision or degrades, but it never throws.
// Callers (the lead API, the OpenClaw guard, and the /admin sign-in action) can
// therefore treat the result as data instead of wrapping each call in a
// try/catch of their own.
//
// Three layers make that true:
//
//   1. Configuration is validated before a client is built, so a malformed
//      UPSTASH_REDIS_REST_URL can never reach the SDK.
//   2. Redis-backed calls are timed out and caught. Auto-pipelining is disabled
//      (see `redis()` for why) so protocol surprises surface as ordinary errors.
//   3. When Redis is unwell the request is still limited, by a conservative
//      in-process limiter, and a circuit breaker stops us paying the timeout on
//      every subsequent request. We degrade, we do not fail open.
//
// When Upstash is not configured at all — the normal local-dev case — every
// helper is a documented no-op and reports `skipped: true`.

// --- configuration ---------------------------------------------------------

type LimiterKind = 'form' | 'webhook';

type LimiterSpec = {
  prefix: string;
  tokens: number;
  windowMs: number;
  /**
   * Budget applied per server instance while Redis is unavailable. Kept well
   * below `tokens` on purpose: a single instance only observes a slice of the
   * traffic, so a smaller local budget keeps the aggregate close to the real
   * limit rather than multiplying it by the number of running instances.
   */
  degradedTokens: number;
};

const LIMITERS: Record<LimiterKind, LimiterSpec> = {
  form: { prefix: 'rl:lead:form', tokens: 10, windowMs: 60_000, degradedTokens: 5 },
  webhook: { prefix: 'rl:lead:webhook', tokens: 60, windowMs: 60_000, degradedTokens: 30 },
};

/** How long a single Redis round trip may take before we degrade. */
const REDIS_TIMEOUT_MS = 2_000;
/** Consecutive Redis failures before the breaker opens. */
const BREAKER_FAILURE_THRESHOLD = 3;
/** How long the breaker stays open before a probe is allowed through. */
const BREAKER_COOLDOWN_MS = 30_000;
/** Upper bound on distinct identifiers tracked by the in-process limiter. */
const LOCAL_MAX_KEYS = 10_000;

// --- redis client ----------------------------------------------------------

/**
 * `absent` — no credentials at all: the documented local-dev no-op.
 * `invalid` — credentials are present but unusable, which is an operational
 *   fault, not a decision to stop limiting. Those requests still get limited.
 */
type RedisConfig =
  | { state: 'absent' }
  | { state: 'invalid' }
  | { state: 'ok'; url: string; token: string };

let warnedAboutConfig = false;

/**
 * Read and validate the Upstash REST credentials.
 *
 * The SDK speaks the Upstash REST protocol, which lives at the root of a bare
 * `https://<host>` origin. A `redis://` connection string, a bare hostname, or
 * an origin with a path is a misconfiguration: the SDK would happily build a
 * client and then fail deep inside a command. We refuse it up front instead.
 */
function readRedisConfig(): RedisConfig {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url && !token) return { state: 'absent' };

  if (!url || !token) {
    warnAboutConfig(
      '[ratelimit] only one of UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN is set. ' +
        'Distributed rate limiting is disabled; the in-process limiter is used instead.',
    );
    return { state: 'invalid' };
  }

  if (!/^https?:\/\/[^\s/?#]+\/?$/.test(url)) {
    warnAboutConfig(
      '[ratelimit] UPSTASH_REDIS_REST_URL is not a bare https:// REST origin ' +
        '(expected e.g. https://your-db.upstash.io, with no path). ' +
        'Distributed rate limiting is disabled; the in-process limiter is used instead.',
    );
    return { state: 'invalid' };
  }
  return { state: 'ok', url: url.replace(/\/$/, ''), token };
}

/** Log a configuration fault once per process. Never logs the value itself. */
function warnAboutConfig(message: string): void {
  if (warnedAboutConfig) return;
  warnedAboutConfig = true;
  console.error(message);
}

let cachedRedis: Redis | null | undefined;

function redis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;

  const config = readRedisConfig();
  if (config.state !== 'ok') {
    cachedRedis = null;
    return null;
  }

  try {
    cachedRedis = new Redis({
      url: config.url,
      token: config.token,
      // Auto-pipelining is ON by default in @upstash/redis >= 1.32. It batches
      // every command into `POST /pipeline` and then calls `.map()` on the
      // decoded response without checking that it is an array. Any endpoint
      // that answers 200 with a JSON *object* — a proxy, a misrouted host, an
      // error envelope — therefore produces `TypeError: res.map is not a
      // function` thrown from inside the SDK, which is not catchable as a
      // meaningful Redis error and crashed /admin/login in production.
      //
      // Single commands take the `{ result, error }` path instead, which turns
      // the same situation into an ordinary Error we can catch and degrade on.
      enableAutoPipelining: false,
      // The SDK defaults to 5 retries with exponential backoff (~7s worst
      // case). A sign-in form cannot wait that long; one retry is enough to
      // ride out a blip, and anything worse belongs in the fallback path.
      retry: { retries: 1, backoff: () => 100 },
    });
  } catch (error) {
    // `new Redis()` validates the URL and can throw. Treat it as unconfigured.
    console.error(`[ratelimit] could not create the Redis client: ${describeError(error)}`);
    cachedRedis = null;
  }
  return cachedRedis;
}

const limiterCache = new Map<LimiterKind, Ratelimit | null>();

function limiter(kind: LimiterKind): Ratelimit | null {
  const cached = limiterCache.get(kind);
  if (cached !== undefined) return cached;

  const client = redis();
  if (!client) {
    limiterCache.set(kind, null);
    return null;
  }

  const spec = LIMITERS[kind];
  const instance = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(spec.tokens, `${spec.windowMs / 1000} s`),
    analytics: true,
    prefix: spec.prefix,
    // The SDK's own timeout resolves as `success: true` — a silent fail-open we
    // do not want on a sign-in form. Disable it and apply our own deadline so a
    // slow Redis lands in the degraded limiter instead.
    timeout: 0,
  });
  limiterCache.set(kind, instance);
  return instance;
}

// --- circuit breaker -------------------------------------------------------

const breaker = { failures: 0, openUntil: 0 };

function breakerIsOpen(now: number): boolean {
  return now < breaker.openUntil;
}

function recordRedisSuccess(): void {
  breaker.failures = 0;
  breaker.openUntil = 0;
}

function recordRedisFailure(now: number): void {
  breaker.failures += 1;
  if (breaker.failures >= BREAKER_FAILURE_THRESHOLD) {
    breaker.openUntil = now + BREAKER_COOLDOWN_MS;
  }
}

// --- in-process fallback limiter -------------------------------------------

// Sliding window over request timestamps, scoped to this server instance. It is
// intentionally simple: no eviction timers, no background work, bounded memory.
const localHits = new Map<string, number[]>();

function sweepLocalHits(now: number): void {
  if (localHits.size <= LOCAL_MAX_KEYS) return;
  const oldest = now - Math.max(...Object.values(LIMITERS).map((s) => s.windowMs));
  for (const [key, hits] of localHits) {
    if (hits.length === 0 || hits[hits.length - 1] <= oldest) localHits.delete(key);
  }
  // Still oversized after a sweep means sustained abuse from many identifiers.
  // Dropping everything costs one window of accuracy and bounds memory.
  if (localHits.size > LOCAL_MAX_KEYS) localHits.clear();
}

function localLimit(key: string, tokens: number, windowMs: number, now: number) {
  sweepLocalHits(now);
  const cutoff = now - windowMs;
  const hits = (localHits.get(key) ?? []).filter((at) => at > cutoff);
  const success = hits.length < tokens;
  if (success) hits.push(now);
  localHits.set(key, hits);
  return {
    success,
    limit: tokens,
    remaining: Math.max(0, tokens - hits.length),
    // When the window is full, callers may retry once the oldest hit ages out.
    reset: (hits.length > 0 ? hits[0] : now) + windowMs,
  };
}

// --- helpers ---------------------------------------------------------------

/**
 * Render an error for the logs with the Redis URL and token scrubbed out.
 * Upstash errors echo the failing command, so they can carry configuration.
 */
function describeError(error: unknown): string {
  let text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  for (const secret of [
    process.env.UPSTASH_REDIS_REST_URL?.trim(),
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  ]) {
    if (secret) text = text.split(secret).join('[redacted]');
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis did not respond within ${ms}ms`)), ms);
  });
  // Promise.race subscribes to both, so neither can reject unhandled.
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

// --- public API ------------------------------------------------------------

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  /** Upstash is not configured — no limit was applied at all. */
  skipped: boolean;
  /** Redis was unavailable; the decision came from the in-process limiter. */
  degraded: boolean;
};

function unlimited(): RateLimitResult {
  return { success: true, limit: 0, remaining: 0, reset: 0, skipped: true, degraded: false };
}

function degradedLimit(kind: LimiterKind, identifier: string, now: number): RateLimitResult {
  const spec = LIMITERS[kind];
  const decision = localLimit(
    `${spec.prefix}:${identifier}`,
    spec.degradedTokens,
    spec.windowMs,
    now,
  );
  return { ...decision, skipped: false, degraded: true };
}

/**
 * Apply a limiter. Never throws, never rejects: infrastructure problems are
 * reported as a degraded decision, not raised to the caller.
 */
async function runLimiter(kind: LimiterKind, identifier: string): Promise<RateLimitResult> {
  try {
    const now = Date.now();

    if (breakerIsOpen(now)) return degradedLimit(kind, identifier, now);

    const instance = limiter(kind);
    if (!instance) {
      // No limiter: either Upstash is genuinely unconfigured (dev, preview) or
      // the configuration was rejected as malformed. The first is a documented
      // no-op; the second is an outage and must still be limited.
      return readRedisConfig().state === 'absent'
        ? unlimited()
        : degradedLimit(kind, identifier, now);
    }

    try {
      const result = await withTimeout(instance.limit(identifier), REDIS_TIMEOUT_MS);
      recordRedisSuccess();
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        skipped: false,
        degraded: false,
      };
    } catch (error) {
      recordRedisFailure(now);
      console.error(
        `[ratelimit] ${kind} limiter unavailable, using the in-process fallback: ${describeError(error)}`,
      );
      return degradedLimit(kind, identifier, Date.now());
    }
  } catch (error) {
    // Belt and braces: this function is contractually total, so even a bug in
    // the fallback path must not reach the caller.
    console.error(`[ratelimit] ${kind} limiter failed unexpectedly: ${describeError(error)}`);
    return { success: true, limit: 0, remaining: 0, reset: 0, skipped: false, degraded: true };
  }
}

export async function limitForm(identifier: string): Promise<RateLimitResult> {
  return runLimiter('form', identifier);
}

export async function limitWebhook(identifier: string): Promise<RateLimitResult> {
  return runLimiter('webhook', identifier);
}

// Idempotency: cache lead-id keyed by client-supplied Idempotency-Key for 24h.
// Lets OpenClaw and other agents safely retry POSTs without duplicating leads.
// Both helpers degrade to "no cached value" when Redis is unavailable — a
// retried POST may create a second lead, which beats failing the request.
const IDEM_TTL_SECONDS = 60 * 60 * 24;

export async function getIdempotent(key: string): Promise<string | null> {
  const client = redis();
  if (!client) return null;
  try {
    return (await withTimeout(client.get<string>(`idem:lead:${key}`), REDIS_TIMEOUT_MS)) ?? null;
  } catch (error) {
    console.error(`[ratelimit] idempotency read failed: ${describeError(error)}`);
    return null;
  }
}

export async function setIdempotent(key: string, leadId: string): Promise<void> {
  const client = redis();
  if (!client) return;
  try {
    await withTimeout(
      client.set(`idem:lead:${key}`, leadId, { ex: IDEM_TTL_SECONDS }),
      REDIS_TIMEOUT_MS,
    );
  } catch (error) {
    console.error(`[ratelimit] idempotency write failed: ${describeError(error)}`);
  }
}

// Pull the best-effort client IP from common Vercel / proxy headers.
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'anonymous'
  );
}

/**
 * Drop every cached client, limiter, breaker and fallback counter.
 * Exported for `scripts/test-ratelimit.ts`, which swaps the environment and
 * `fetch` between cases. Not used by application code.
 */
export function __resetRateLimiterState(): void {
  cachedRedis = undefined;
  limiterCache.clear();
  localHits.clear();
  breaker.failures = 0;
  breaker.openUntil = 0;
  warnedAboutConfig = false;
}
