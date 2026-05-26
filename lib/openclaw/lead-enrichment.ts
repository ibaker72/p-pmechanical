import { isOpenClawConfigured, runPrompt } from '@/lib/openclaw/client';
import { leadSummaryPrompt } from '@/lib/openclaw/prompts';
import { sendOwnerAiSummary } from '@/lib/resend';
import type { WebhookInput } from '@/lib/validations';

// Fire-and-forget lead enrichment. Generates an OpenClaw summary for a captured
// lead and emails it to the owner. MUST NOT throw or block lead submission —
// callers invoke it without awaiting. No-ops cleanly when OpenClaw is off.
export async function enrichLeadWithOpenClaw(
  lead: Omit<WebhookInput, 'website_url'>,
): Promise<void> {
  if (!isOpenClawConfigured()) return;

  try {
    const { system, user } = leadSummaryPrompt({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      service: lead.service_type,
      city: lead.city,
      message: lead.message,
      sourcePage: lead.source,
    });

    const result = await runPrompt(system, user, { temperature: 0.3, maxTokens: 600 });
    if (!result.ok || !result.text) return;

    await sendOwnerAiSummary(
      {
        name: lead.name,
        email: lead.email,
        service_type: lead.service_type,
        source: lead.source,
      },
      result.text,
    );
  } catch {
    // Enrichment is best-effort; never surface errors to the lead pipeline.
  }
}
