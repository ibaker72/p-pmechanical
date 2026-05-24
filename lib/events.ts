import crypto from 'node:crypto';
import type { LeadRecord } from './supabase';

// Fire-and-forget outbound webhook for new leads. OpenClaw (or any agent /
// CRM / automation) subscribes to this to push notifications, route to
// WhatsApp/Telegram/Slack, or trigger downstream automations.

export type OutboundEvent =
  | {
      type: 'lead.created';
      occurred_at: string;
      lead_id: string | null;
      lead: LeadRecord;
    }
  | {
      type: 'lead.failed';
      occurred_at: string;
      error: string;
      lead: LeadRecord;
    };

function sign(body: string, secret: string): string {
  return (
    't=' + Date.now() + ',v1=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  );
}

export async function emitEvent(
  event: OutboundEvent,
): Promise<{ skipped: boolean; ok?: boolean; status?: number }> {
  const url = process.env.OUTBOUND_WEBHOOK_URL;
  if (!url) return { skipped: true };

  const secret = process.env.OUTBOUND_WEBHOOK_SECRET;
  const body = JSON.stringify(event);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'PPMechanical-Events/1.0',
    'X-Event-Type': event.type,
  };
  if (secret) headers['X-Signature'] = sign(body, secret);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      // 5s ceiling — outbound failures must never block a lead capture.
      signal: AbortSignal.timeout(5000),
    });
    return { skipped: false, ok: res.ok, status: res.status };
  } catch {
    return { skipped: false, ok: false };
  }
}
