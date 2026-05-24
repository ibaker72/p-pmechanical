import { NextResponse } from 'next/server';
import { BUSINESS, SERVICES, ALL_SERVICE_AREAS } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

// Machine-readable manifest served at /.well-known/agent.json (via rewrite in
// next.config.mjs). Modeled after OpenAI's ai-plugin.json so OpenClaw,
// ChatGPT, custom agents, and CRMs can discover and act on this site without
// scraping HTML.
export function GET() {
  const manifest = {
    schema_version: '2025-01',
    name_for_human: BUSINESS.name,
    name_for_model: 'pp_mechanical_hvac',
    description_for_human: `${BUSINESS.name} is a 24/7 HVAC, boiler, and AC contractor serving Clifton, NJ and the surrounding Passaic, Essex, and Bergen county region.`,
    description_for_model: `Use this manifest to interact with ${BUSINESS.name}, an NJ-licensed HVAC contractor. Capabilities include reading available services and service areas, and submitting customer leads (form submissions or webhook integration). Lead submission requires at minimum: source, and ideally name + phone or email + service_type. Honor rate limits and supply an Idempotency-Key when retrying.`,
    business: {
      name: BUSINESS.name,
      legal_name: BUSINESS.legalName,
      phone: BUSINESS.phone,
      email: BUSINESS.email,
      address: BUSINESS.address,
      license: BUSINESS.license,
      hours: '24/7/365',
      url: SITE_URL,
      founded: BUSINESS.founded,
      social: BUSINESS.social,
    },
    capabilities: ['query_services', 'query_service_area', 'submit_lead'],
    rate_limits: {
      form_submission_per_minute_per_ip: 10,
      webhook_submission_per_minute_per_secret: 60,
    },
    auth: {
      webhook: {
        type: 'shared_secret_header',
        header: 'X-Webhook-Secret',
        env_var: 'WEBHOOK_SECRET',
        description:
          'Set WEBHOOK_SECRET in the site environment and present the same value in the X-Webhook-Secret request header. If unset, the webhook accepts unauthenticated POSTs subject to rate limits.',
      },
      outbound_event_signing: {
        type: 'hmac_sha256',
        header: 'X-Signature',
        format: 't={unix_ms},v1={hex_digest}',
        env_var: 'OUTBOUND_WEBHOOK_SECRET',
      },
    },
    actions: [
      {
        name: 'query_services',
        method: 'GET',
        url: `${SITE_URL}/api/services`,
        response: {
          content_type: 'application/json',
          shape: '{ business, services: Service[], service_areas: string[] }',
        },
      },
      {
        name: 'submit_lead',
        method: 'POST',
        url: `${SITE_URL}/api/leads/webhook`,
        content_type: 'application/json',
        headers: {
          'Idempotency-Key':
            'Optional. UUID/ULID. Identical keys within 24h return the original lead_id.',
          'X-Webhook-Secret': 'Optional unless WEBHOOK_SECRET is configured on the server.',
        },
        request_schema: {
          name: 'string?',
          email: 'string (email)?',
          phone: 'string?',
          service_type: 'string?',
          home_size: 'string?',
          system_age: 'string?',
          message: 'string?',
          city: 'string?',
          preferred_contact_time: 'string?',
          source:
            'string (required) — identifies the channel, e.g. "openclaw", "n8n", "make_scenario_42"',
        },
        response_schema: {
          ok: 'boolean',
          lead_id: 'string | null',
          stored: 'boolean',
          created_at: 'iso8601 string?',
          idempotent: 'boolean?',
          warnings: 'string[]?',
        },
        example_request: {
          name: 'Jane Smith',
          phone: '(973) 555-0123',
          email: 'jane@example.com',
          service_type: 'Boiler Installation',
          city: 'Clifton',
          message: 'Need a quote on replacing my 1990s gas boiler.',
          source: 'openclaw',
        },
      },
      {
        name: 'long_form_context',
        method: 'GET',
        url: `${SITE_URL}/llms-full.txt`,
        description:
          'Markdown bundle of every service, location, FAQ, review, and blog excerpt — for grounding.',
      },
    ],
    outbound_events: [
      {
        type: 'lead.created',
        description:
          'Fires after a lead is successfully captured. Configure OUTBOUND_WEBHOOK_URL on the server to receive these. Signed with HMAC-SHA256 in X-Signature.',
        payload_shape: {
          type: 'lead.created',
          occurred_at: 'iso8601',
          lead_id: 'string | null',
          lead: 'LeadRecord',
        },
      },
    ],
    services_summary: SERVICES.map((s) => ({
      slug: s.slug,
      name: s.name,
      short: s.short,
      starting_price: s.startingPrice ?? null,
      url: `${SITE_URL}/services/${s.slug}`,
    })),
    service_areas: ALL_SERVICE_AREAS,
    contact_for_humans: {
      phone: BUSINESS.phone,
      email: BUSINESS.email,
      quote_url: `${SITE_URL}/quote`,
      contact_url: `${SITE_URL}/contact`,
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
