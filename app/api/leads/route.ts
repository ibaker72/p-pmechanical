import { NextResponse } from 'next/server';
import { webhookSchema } from '@/lib/validations';
import { captureLead } from '@/lib/leads';
import { sendSavingsGuide } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const lead = parsed.data;

  try {
    const result = await captureLead(lead);

    // Special-case: savings guide lead also gets the PDF email.
    if (lead.source === 'savings_guide' && lead.email) {
      await sendSavingsGuide(lead.email, lead.name).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      lead_id: result.id,
      stored: result.id !== null,
      warning: result.supabaseError,
      emails: result.emails,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 },
    );
  }
}
