import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Graceful: in dev (or when Upstash env vars are missing) every helper becomes
// a no-op so the routes still work locally.

let cachedRedis: Redis | null = null;
function redis(): Redis | null {
  if (cachedRedis) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

const formLimiterCache: { v: Ratelimit | null } = { v: null };
const webhookLimiterCache: { v: Ratelimit | null } = { v: null };

function formLimiter(): Ratelimit | null {
  if (formLimiterCache.v) return formLimiterCache.v;
  const r = redis();
  if (!r) return null;
  formLimiterCache.v = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'rl:lead:form',
  });
  return formLimiterCache.v;
}

function webhookLimiter(): Ratelimit | null {
  if (webhookLimiterCache.v) return webhookLimiterCache.v;
  const r = redis();
  if (!r) return null;
  webhookLimiterCache.v = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'rl:lead:webhook',
  });
  return webhookLimiterCache.v;
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  skipped: boolean;
};

export async function limitForm(identifier: string): Promise<RateLimitResult> {
  const l = formLimiter();
  if (!l) return { success: true, limit: 0, remaining: 0, reset: 0, skipped: true };
  const r = await l.limit(identifier);
  return { ...r, skipped: false };
}

export async function limitWebhook(identifier: string): Promise<RateLimitResult> {
  const l = webhookLimiter();
  if (!l) return { success: true, limit: 0, remaining: 0, reset: 0, skipped: true };
  const r = await l.limit(identifier);
  return { ...r, skipped: false };
}

// Idempotency: cache lead-id keyed by client-supplied Idempotency-Key for 24h.
// Lets OpenClaw and other agents safely retry POSTs without duplicating leads.
const IDEM_TTL_SECONDS = 60 * 60 * 24;

export async function getIdempotent(key: string): Promise<string | null> {
  const r = redis();
  if (!r) return null;
  return (await r.get<string>(`idem:lead:${key}`)) ?? null;
}

export async function setIdempotent(key: string, leadId: string): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.set(`idem:lead:${key}`, leadId, { ex: IDEM_TTL_SECONDS });
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
