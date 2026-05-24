#!/usr/bin/env tsx
// Validate environment variables against `lib/env.ts` schema.
//
// Behavior:
//   - In production (NODE_ENV=production) all PRODUCTION_REQUIRED vars must
//     be present and well-formed; missing/invalid causes a non-zero exit.
//   - In development/CI without secrets, the schema is parsed leniently and
//     warnings are printed but the script exits 0.
//
// Run: `npm run validate:env`  (also wired into `prebuild`)

import { envSchema, PRODUCTION_REQUIRED, type Env } from '../lib/env';

const env = process.env;
const isProd = env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';

const result = envSchema.safeParse(env);

if (!result.success) {
  const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`[validate-env] Environment validation failed:\n${issues}`);
  process.exit(1);
}

const data = result.data as Env;
const missing = PRODUCTION_REQUIRED.filter((k) => !data[k]);

if (missing.length > 0) {
  const msg = `[validate-env] Missing required env vars: ${missing.join(', ')}`;
  if (isProd) {
    console.error(msg);
    process.exit(1);
  } else {
    console.warn(`${msg} (dev — continuing)`);
  }
}

console.log('[validate-env] OK');
