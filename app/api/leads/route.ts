import { NextResponse } from 'next/server';
import { webhookSchema } from '@/lib/validations';
import { captureLead } from '@/lib/leads';
import { sendSavingsGuide } from '@/lib/resend';
import { clientIp, getIdempotent, limitForm, limitWebhook, setIdempotent } from '@/lib/ratelimit';
import { emitEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export async function POST(req: Request) {
  // Distinguish form submissions from server-to-server webhook calls.
  // Webhooks present a secret header; everything else is treated as a form.
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const presentedSecret = req.headers.get('x-webhook-secret');
  const isWebhook = !!webhookSecret && presentedSecret === webhookSecret;

  // If the webhook secret is configured but the caller used the webhook path
  // without it, reject. (The /webhook route forwards here; this guards both.)
  const path = new URL(req.url).pathname;
  if (path.endsWith('/api/leads/webhook') && webhookSecret && !isWebhook) {
    return json({ ok: false, error: 'invalid_webhook_secret' }, { status: 401 });
  }

  // Rate limit by IP (form) or by secret-bearer (webhook).
  const ip = clientIp(req);
  const rl = isWebhook
    ? await limitWebhook(`secret:${(presentedSecret || '').slice(0, 16)}`)
    : await limitForm(`ip:${ip}`);
  if (!rl.success) {
    return json(
      { ok: false, error: 'rate_limited', retry_after_ms: Math.max(0, rl.reset - Date.now()) },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Honeypot: silently accept (200) so bots think they succeeded — never write.
  if (parsed.data.website_url && parsed.data.website_url.length > 0) {
    return json({ ok: true, lead_id: null, stored: false, suppressed: true });
  }

  // Strip honeypot before persisting / passing downstream.
  const { website_url: _hp, ...lead } = parsed.data;

  // Idempotency: if the caller supplies an Idempotency-Key and we have a
  // matching prior lead, return it without re-creating.
  const idemKey = req.headers.get('idempotency-key');
  if (idemKey) {
    const existing = await getIdempotent(idemKey);
    if (existing) {
      return json({ ok: true, lead_id: existing, stored: true, idempotent: true });
    }
  }

  try {
    const result = await captureLead(lead);

    if (idemKey && result.id) await setIdempotent(idemKey, result.id);

    if (lead.source === 'savings_guide' && lead.email) {
      await sendSavingsGuide(lead.email, lead.name ?? undefined).catch(() => undefined);
    }

    // Fire-and-forget outbound event — never blocks the response.
    emitEvent({
      type: 'lead.created',
      occurred_at: new Date().toISOString(),
      lead_id: result.id,
      lead,
    }).catch(() => undefined);

    const warnings: string[] = [];
    if (result.supabaseError) warnings.push(`storage: ${result.supabaseError}`);
    if (result.emails.owner === 'failed') warnings.push('email_owner: failed');
    if (result.emails.customer === 'failed') warnings.push('email_customer: failed');

    return json(
      {
        ok: true,
        lead_id: result.id,
        stored: result.id !== null,
        created_at: new Date().toISOString(),
        emails: result.emails,
        ...(warnings.length ? { warnings } : {}),
      },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : 'server_error' },
      { status: 500 },
    );
  }
}

function rateLimitHeaders(rl: {
  limit: number;
  remaining: number;
  reset: number;
  skipped: boolean;
}) {
  if (rl.skipped) return undefined;
  return {
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rl.reset / 1000)),
  };
}
