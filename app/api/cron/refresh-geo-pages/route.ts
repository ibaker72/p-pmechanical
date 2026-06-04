import { NextResponse } from 'next/server';
import { EXPANSION_LOCATIONS } from '@/lib/geo/locations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function json(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get('authorization') ?? '';
  if (auth === `Bearer ${expected}`) return true;
  // Vercel cron also accepts a request that originates internally — but we
  // still require the secret either way.
  const xCron = req.headers.get('x-cron-secret');
  return !!xCron && xCron === expected;
}

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRefresh(req: Request) {
  const expected = process.env.CRON_SECRET ?? '';
  const origin = getOrigin(req);
  const results: Array<{
    slug: string;
    city: string;
    state: string;
    status: 'ok' | 'failed';
    error?: string;
    http_status?: number;
  }> = [];

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < EXPANSION_LOCATIONS.length; i++) {
    const loc = EXPANSION_LOCATIONS[i];
    try {
      const res = await fetch(`${origin}/api/generate-city-page`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cron-secret': expected,
        },
        body: JSON.stringify({ city: loc.city, state: loc.state }),
        cache: 'no-store',
      });
      if (res.ok) {
        succeeded++;
        results.push({ slug: loc.slug, city: loc.city, state: loc.state, status: 'ok' });
      } else {
        failed++;
        const detail = await res.text().catch(() => '');
        results.push({
          slug: loc.slug,
          city: loc.city,
          state: loc.state,
          status: 'failed',
          http_status: res.status,
          error: detail.slice(0, 300),
        });
      }
    } catch (e) {
      failed++;
      results.push({
        slug: loc.slug,
        city: loc.city,
        state: loc.state,
        status: 'failed',
        error: e instanceof Error ? e.message : 'network_error',
      });
    }
    if (i < EXPANSION_LOCATIONS.length - 1) await sleep(4000);
  }

  return json({
    ok: failed === 0,
    total: EXPANSION_LOCATIONS.length,
    succeeded,
    failed,
    results,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return runRefresh(req);
}

export async function GET(req: Request) {
  if (!authorized(req)) return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return runRefresh(req);
}
