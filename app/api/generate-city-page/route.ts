import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAnthropicWithTool, isAnthropicConfigured } from '@/lib/anthropic/client';
import {
  buildSystemPrompt,
  buildUserPrompt,
  serviceAreaTool,
  SERVICE_AREA_TOOL_NAME,
  type GeneratedSections,
} from '@/lib/geo/prompt';
import { sanitizeSections, normalizeCity, normalizeState } from '@/lib/geo/sanitize';
import { buildLocationPageHtml } from '@/lib/geo/build-location-html';
import { upsertGeoPage } from '@/lib/geo/repository';
import { isStaticLocationSlug } from '@/lib/geo/locations';
import { buildServiceAreaSlug } from '@/lib/seo/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

const generateSchema = z.object({
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(40),
  dry_run: z.boolean().optional(),
});

function requireCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const presented = req.headers.get('x-cron-secret');
  return !!presented && presented === expected;
}

export async function POST(req: Request) {
  if (!requireCronSecret(req)) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!isAnthropicConfigured()) {
    return json(
      {
        ok: false,
        stage: 'config',
        anthropic_api_key_present: false,
        error: 'anthropic_api_key_missing',
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const city = normalizeCity(parsed.data.city);
  const state = normalizeState(parsed.data.state);
  const dryRun = parsed.data.dry_run === true;
  const slug = buildServiceAreaSlug(city, state);

  if (isStaticLocationSlug(slug)) {
    return json(
      {
        ok: false,
        stage: 'route_guard',
        error: 'static_page_collision',
        message: `The slug "${slug}" is already covered by a hardcoded static page. The AI generator only handles expansion cities.`,
        slug,
      },
      { status: 409 },
    );
  }

  const callResult = await callAnthropicWithTool<GeneratedSections>({
    system: buildSystemPrompt(),
    user: buildUserPrompt(city, state),
    tools: [serviceAreaTool],
    toolName: SERVICE_AREA_TOOL_NAME,
    maxTokens: 2400,
    temperature: 0.5,
  });

  if (!callResult.ok) {
    return json(
      {
        ok: false,
        stage: 'anthropic',
        error: callResult.error,
        ...('status' in callResult && callResult.status ? { http_status: callResult.status } : {}),
        ...('detail' in callResult && callResult.detail ? { detail: callResult.detail } : {}),
      },
      { status: 502 },
    );
  }

  const sectionsRaw = callResult.toolUse.input as GeneratedSections;

  const requiredKeys: (keyof GeneratedSections)[] = [
    'meta_title',
    'meta_description',
    'h1_heading',
    'intro_paragraph',
    'services_paragraph',
    'emergency_paragraph',
    'financing_or_estimate_paragraph',
    'why_choose_paragraph',
    'service_area_paragraph',
    'faq_1_question',
    'faq_1_answer',
    'faq_2_question',
    'faq_2_answer',
    'faq_3_question',
    'faq_3_answer',
  ];
  const missing = requiredKeys.filter(
    (k) => !sectionsRaw?.[k] || typeof sectionsRaw[k] !== 'string',
  );
  if (missing.length) {
    return json(
      { ok: false, stage: 'anthropic_schema', error: 'missing_fields', missing },
      { status: 502 },
    );
  }

  const { sanitized, warnings } = sanitizeSections(sectionsRaw);

  const { html, faqs } = buildLocationPageHtml(sanitized, { city, state });

  const preview = {
    slug,
    city,
    state,
    meta_title: sanitized.meta_title,
    meta_description: sanitized.meta_description,
    h1_heading: sanitized.h1_heading,
    page_content_html: html,
    faqs,
  };

  if (dryRun) {
    return json({ ok: true, dry_run: true, preview, warnings });
  }

  const saved = await upsertGeoPage({
    slug,
    city,
    state,
    title: sanitized.meta_title,
    meta_description: sanitized.meta_description,
    h1: sanitized.h1_heading,
    intro_copy: sanitized.intro_paragraph,
    service_focus: sanitized.services_paragraph,
    page_content_html: html,
    faq_json: faqs,
    is_published: true,
  });

  if (!saved.ok) {
    return json(
      { ok: false, stage: 'supabase', error: saved.error ?? 'unknown_db_error', warnings },
      { status: 500 },
    );
  }

  return json({
    ok: true,
    dry_run: false,
    slug,
    saved: {
      id: saved.row?.id,
      slug: saved.row?.slug,
      is_published: saved.row?.is_published,
      updated_at: saved.row?.updated_at,
    },
    preview,
    warnings,
  });
}
