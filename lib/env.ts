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
  ADMIN_SECRET: nonEmpty.optional().describe('Bearer token protecting /api/leads/list'),

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
