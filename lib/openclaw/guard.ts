import { NextResponse } from 'next/server';
import { clientIp, limitWebhook } from '@/lib/ratelimit';

// Shared protection for the internal OpenClaw automation routes. These are
// server-to-server endpoints (CRM, n8n, owner dashboard). If
// OPENCLAW_INTERNAL_SECRET is set, callers must present a matching
// x-internal-secret header. Every request is also rate-limited by IP.

export type GuardResult = { ok: true } | { ok: false; response: NextResponse };

export async function guardOpenClawRoute(req: Request): Promise<GuardResult> {
  const secret = process.env.OPENCLAW_INTERNAL_SECRET;
  if (secret) {
    const presented = req.headers.get('x-internal-secret');
    if (presented !== secret) {
      return {
        ok: false,
        response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
      };
    }
  }

  const ip = clientIp(req);
  const rl = await limitWebhook(`openclaw:${ip}`);
  if (!rl.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'rate_limited', retry_after_ms: Math.max(0, rl.reset - Date.now()) },
        { status: 429 },
      ),
    };
  }

  return { ok: true };
}

export async function parseJson<T = unknown>(
  req: Request,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, data: (await req.json()) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }),
    };
  }
}
