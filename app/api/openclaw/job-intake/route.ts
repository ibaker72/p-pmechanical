import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runPrompt } from '@/lib/openclaw/client';
import { estimatePrepPrompt } from '@/lib/openclaw/prompts';
import { guardOpenClawRoute, parseJson } from '@/lib/openclaw/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Job intake → internal technician prep notes for an upcoming service call.
const schema = z.object({
  service: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  issue: z.string().min(3, 'Describe the issue'),
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

  const { system, user } = estimatePrepPrompt(input.data);
  const result = await runPrompt(system, user, { temperature: 0.4, maxTokens: 700 });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, text: '', error: result.error ?? 'openclaw_error' },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, text: result.text });
}
