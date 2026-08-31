import { z } from 'zod';

// Single source of truth for environment variables. Each var is documented with
// its purpose. The schema is consumed by `scripts/validate-env.ts` (build-time)
// and can also be imported at runtime if a hard guarantee is needed.

const url = z.string().url();
const nonEmpty = z.string().min(1);

export const envSchema = z.object({
  // Site
  NEXT_PUBLIC_SITE_URL: url.describe('Public site URL — used by metadata, sitemap, JSON-LD'),

  // Supabase (lead storage)
  SUPABASE_URL: url.optional().describe('Supabase project URL'),
  SUPABASE_ANON_KEY: nonEmpty.optional().describe('Supabase anon key (unused server-side)'),
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty
    .optional()
    .describe('Supabase service-role key — server only'),

  // Email (Resend)
  RESEND_API_KEY: nonEmpty.optional().describe('Resend API key — required for transactional email'),
  OWNER_EMAIL: z.string().email().optional().describe('Where new-lead notifications are sent'),

  // Admin
  // Doubles as the sign-in password for the /admin estimating system, so it
  // must be at least 16 characters for admin sessions to be enabled.
  ADMIN_SECRET: nonEmpty
    .optional()
    .describe('Bearer token for /api/leads/list AND the /admin sign-in password (min 16 chars)'),
  ADMIN_SESSION_SECRET: nonEmpty
    .optional()
    .describe('Optional dedicated HMAC key for admin session cookies. Defaults to ADMIN_SECRET.'),
  ADMIN_EMAIL: z
    .string()
    .email()
    .optional()
    .describe(
      'Label recorded in created_by/updated_by on estimating records. Defaults to "owner".',
    ),

  // Commercial estimating system
  SUPABASE_DOCUMENTS_BUCKET: nonEmpty
    .optional()
    .describe('Private Supabase Storage bucket for bid documents. Defaults to project-documents.'),

  // Anti-abuse / rate limiting (Upstash Redis)
  UPSTASH_REDIS_REST_URL: url
    .optional()
    .describe('Upstash Redis REST URL for rate limit + idempotency'),
  UPSTASH_REDIS_REST_TOKEN: nonEmpty.optional().describe('Upstash Redis REST token'),

  // Webhook authentication & outbound events
  WEBHOOK_SECRET: nonEmpty.optional().describe('Validates X-Webhook-Secret on /api/leads/webhook'),
  OUTBOUND_WEBHOOK_URL: url.optional().describe('Where to POST new-lead events (e.g. OpenClaw)'),
  OUTBOUND_WEBHOOK_SECRET: nonEmpty
    .optional()
    .describe('HMAC-SHA256 key for outbound event signing'),

  // Client-side overrides
  NEXT_PUBLIC_BUSINESS_PHONE: z.string().optional(),
  NEXT_PUBLIC_BUSINESS_PHONE_DISPLAY: z.string().optional(),

  // OpenClaw (server-side AI gateway for lead automation / prompt workflows).
  // The API key is server-only and must never be exposed to the browser.
  OPENCLAW_ENABLED: z.enum(['true', 'false']).optional().describe('Feature flag for OpenClaw'),
  OPENCLAW_BASE_URL: url.optional().describe('OpenClaw gateway base URL'),
  OPENCLAW_API_KEY: nonEmpty.optional().describe('OpenClaw API key — server only, never public'),
  OPENCLAW_MODEL: nonEmpty.optional().describe('Default model for OpenClaw calls'),
  OPENCLAW_CHAT_PATH: nonEmpty
    .optional()
    .describe('Override chat path (default /v1/chat/completions)'),
  OPENCLAW_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Request timeout (ms)'),
  OPENCLAW_INTERNAL_SECRET: nonEmpty
    .optional()
    .describe('If set, OpenClaw routes require a matching x-internal-secret header'),

  // Anthropic (direct Claude API for AI SEO page generation). Server-only.
  ANTHROPIC_API_KEY: nonEmpty
    .optional()
    .describe('Anthropic Claude API key — server only, never public'),
  ANTHROPIC_MODEL: nonEmpty.optional().describe('Override model id, default claude-sonnet-4-6'),
  ANTHROPIC_API_BASE_URL: url
    .optional()
    .describe('Override Anthropic API base URL, default https://api.anthropic.com/v1'),
  ANTHROPIC_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .describe('Request timeout for Anthropic calls (ms), default 30000'),

  // Cron / internal protection. Used by /api/generate-city-page and
  // /api/cron/refresh-geo-pages. Required to call those routes at all.
  CRON_SECRET: nonEmpty
    .optional()
    .describe('Shared secret for x-cron-secret header and Authorization: Bearer on cron routes'),
});

export type Env = z.infer<typeof envSchema>;

// Vars that must be present in production. Dev gracefully degrades.
export const PRODUCTION_REQUIRED: (keyof Env)[] = [
  'NEXT_PUBLIC_SITE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'OWNER_EMAIL',
  'ADMIN_SECRET',
];
