import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Web Vitals collector. Vercel Speed Insights handles the heavy lifting in
// production; this endpoint is a lightweight fallback that logs metrics so
// we can verify reporting locally and during preview builds.
//
// Body shape (from web-vitals v4):
//   { name, value, rating, id, navigationType, delta, entries? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (process.env.NODE_ENV !== 'production' || process.env.VITALS_LOG === '1') {
      const { name, value, rating, id } = body ?? {};
      // eslint-disable-next-line no-console
      console.log(`[vitals] ${name}=${value} (${rating}) id=${id}`);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
