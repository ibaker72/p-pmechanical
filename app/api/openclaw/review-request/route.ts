import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runPrompt } from '@/lib/openclaw/client';
import { reviewRequestPrompt } from '@/lib/openclaw/prompts';
import { guardOpenClawRoute, parseJson } from '@/lib/openclaw/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().optional().nullable(),
  service: z.string().optional().nullable(),
  channel: z.enum(['sms', 'email']).optional(),
  reviewLink: z.string().url().optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await guardOpenClawRoute(req);
  if (!guard.ok) return guard.response;

  const parsed = await parseJson(req);
  if (!parsed.ok) return parsed.response;

  const input = schema.safeParse(parsed.data);
  if (!input.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', issues: input.error.issues },
      { status: 400 },
    );
  }

  const { system, user } = reviewRequestPrompt(input.data);
  const result = await runPrompt(system, user, { temperature: 0.6, maxTokens: 250 });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, text: '', error: result.error ?? 'openclaw_error' },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, text: result.text });
}
