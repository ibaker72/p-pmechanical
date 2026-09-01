// Server-only database access for the estimating system.
//
// Every table created by migrations 003-005 has RLS enabled with NO permissive
// policies, so the anon and authenticated Postgres roles can read and write
// nothing. All access flows through the service-role client here, and every
// caller sits behind requireAdmin()/requireAdminForAction(). There is no
// browser-side Supabase client for estimating data anywhere in the app.

import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export class EstimatingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimatingConfigError';
  }
}

/** Env var names carrying the service-role key, in precedence order. */
const SERVICE_KEY_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SERVICE_ROLE',
] as const;

/**
 * Read an env var, trimming surrounding whitespace and any quotes a dashboard
 * paste may have carried in. A trailing newline in SUPABASE_URL produces a
 * malformed REST URL and a failure that looks nothing like a config problem.
 */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, '$2')
    .trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function serviceKeyVar(): (typeof SERVICE_KEY_VARS)[number] | undefined {
  return SERVICE_KEY_VARS.find((name) => readEnv(name) !== undefined);
}

function serviceKey(): string | undefined {
  const name = serviceKeyVar();
  return name ? readEnv(name) : undefined;
}

/**
 * The Supabase project ref embedded in SUPABASE_URL, or null for a custom
 * domain. Safe to log — it is the public project identifier, not a secret.
 */
export function supabaseProjectRef(url = readEnv('SUPABASE_URL')): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const match = /^([a-z0-9-]+)\.supabase\.(co|in|red)$/i.exec(host);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Supabase issues two key families. `createClient` treats the key as an opaque
 * string — it is sent verbatim as both `apikey` and `Authorization: Bearer` —
 * so both families work with this SDK version. The distinction matters only for
 * diagnostics: which Postgres role the key maps to.
 */
export type SupabaseKeyFormat = 'legacy-jwt' | 'secret' | 'publishable' | 'unknown';

export function supabaseKeyFormat(key: string): SupabaseKeyFormat {
  if (key.startsWith('sb_secret_')) return 'secret';
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (/^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(key)) return 'legacy-jwt';
  return 'unknown';
}

/**
 * The `role` and `ref` claims of a legacy Supabase JWT key.
 *
 * The payload is read WITHOUT verifying the signature and only its non-secret
 * claims are returned, so a stolen key cannot be reconstructed from anything
 * this exposes. Returns null for the new `sb_secret_`/`sb_publishable_` formats,
 * whose role is resolved server-side and cannot be read from the key.
 */
export function readLegacyKeyClaims(key: string): { role?: string; ref?: string } | null {
  if (supabaseKeyFormat(key) !== 'legacy-jwt') return null;
  try {
    const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded: unknown = JSON.parse(
      Buffer.from(payload + '='.repeat((4 - (payload.length % 4)) % 4), 'base64').toString('utf8'),
    );
    if (!decoded || typeof decoded !== 'object') return null;
    const { role, ref } = decoded as { role?: unknown; ref?: unknown };
    return {
      role: typeof role === 'string' ? role : undefined,
      ref: typeof ref === 'string' ? ref : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * A description of how this server is configured to reach Supabase, containing
 * nothing secret. Used by the boot log and by `npm run diagnose:db`.
 */
export type EstimatingDbContext = {
  projectRef: string | null;
  serviceRoleConfigured: boolean;
  /** Which env var supplied the key — a non-primary name is worth knowing. */
  serviceRoleVar: string | null;
  keyFormat: SupabaseKeyFormat | null;
  /** For legacy JWT keys, the role the key claims. */
  keyRole: string | null;
  /** For legacy JWT keys, whether the key's project matches SUPABASE_URL. */
  keyProjectMatchesUrl: boolean | null;
};

export function estimatingDbContext(): EstimatingDbContext {
  const key = serviceKey();
  const projectRef = supabaseProjectRef();
  const claims = key ? readLegacyKeyClaims(key) : null;
  return {
    projectRef,
    serviceRoleConfigured: !!key,
    serviceRoleVar: serviceKeyVar() ?? null,
    keyFormat: key ? supabaseKeyFormat(key) : null,
    keyRole: claims?.role ?? null,
    keyProjectMatchesUrl: claims?.ref && projectRef ? claims.ref === projectRef : null,
  };
}

let loggedContext = false;

/**
 * Log, once per process, how this server is wired to Supabase. Prints the
 * project ref and whether a service-role key is present — never the key.
 */
export function logEstimatingDbContext(): void {
  if (loggedContext) return;
  loggedContext = true;
  const context = estimatingDbContext();
  console.error(`[estimating-db] supabase project ref: ${context.projectRef ?? 'unknown'}`);
  console.error(`[estimating-db] service role configured: ${context.serviceRoleConfigured}`);
  if (context.serviceRoleVar && context.serviceRoleVar !== 'SUPABASE_SERVICE_ROLE_KEY') {
    console.error(
      `[estimating-db] warning: the key came from ${context.serviceRoleVar}, not SUPABASE_SERVICE_ROLE_KEY`,
    );
  }
  if (context.keyRole && context.keyRole !== 'service_role') {
    console.error(
      `[estimating-db] warning: the configured key carries role "${context.keyRole}", not "service_role" — it cannot read the estimating tables`,
    );
  }
  if (context.keyProjectMatchesUrl === false) {
    console.error(
      '[estimating-db] warning: the configured key belongs to a different Supabase project than SUPABASE_URL',
    );
  }
}

/**
 * The service-role Supabase client.
 * Throws rather than returning null so a misconfiguration surfaces as one
 * clear error instead of a cascade of "cannot read property of null".
 */
export function estimatingDb(): SupabaseClient {
  if (cached) return cached;
  const url = readEnv('SUPABASE_URL');
  const key = serviceKey();
  if (!url || !key) {
    throw new EstimatingConfigError(
      'The estimating database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  logEstimatingDbContext();
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Redundant but explicit: supabase-js already sends the key as both `apikey`
    // and `Authorization: Bearer`. Setting them here pins the same value rather
    // than changing it.
    global: { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  });
  return cached;
}

export function isEstimatingDbConfigured(): boolean {
  return !!(readEnv('SUPABASE_URL') && serviceKey());
}

// ---------------------------------------------------------------------------
// Error translation
// ---------------------------------------------------------------------------

/**
 * Human-readable names for the constraints an estimator can actually trip.
 * Keeping this table explicit is what turns "insert or update on table
 * estimate_takeoff_items violates foreign key constraint
 * eti_labor_rate_id_fkey" into a sentence the owner can act on.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  // Unique
  projects_project_number_key: 'A project already uses that project number.',
  estimates_project_revision_key: 'That revision number already exists for this project.',
  materials_sku_key: 'Another material already uses that SKU.',
  vendors_company_name_key: 'A vendor with that company name already exists.',
  labor_rates_code_key: 'Another labor classification already uses that code.',
  labor_modifiers_code_key: 'Another labor modifier already uses that code.',
  scope_categories_code_key: 'Another scope category already uses that code.',
  material_categories_code_key: 'Another material category already uses that code.',
  assemblies_code_key: 'Another assembly already uses that code.',
  equipment_rates_code_key: 'Another equipment rate already uses that code.',
  estimate_checklist_items_unique: 'That checklist item already exists on this estimate.',
  estimate_labor_conditions_unique: 'That condition is already applied to this estimate.',
  jobs_job_number_key: 'A job already uses that job number.',
  jobs_source_estimate_key: 'This estimate has already been converted to a job.',
  job_budgets_job_version_key: 'That budget version already exists for this job.',
  project_documents_storage_path_key: 'A document with that storage path already exists.',

  // Check
  estimates_margin_range:
    'The target gross margin must be at least 0% and less than 100% — a 100% margin implies an infinite sell price.',
  estimates_markup_range: 'The markup percentage is outside the allowed range.',
  estimates_overhead_range: 'The overhead percentage is outside the allowed range.',
  estimates_contingency_range: 'The contingency percentage is outside the allowed range.',
  estimates_dates_ordered: 'The expiration date cannot fall before the bid date.',
  projects_dates_ordered: 'The completion date cannot fall before the start date.',
  eti_quantity_nonneg: 'Quantity cannot be negative.',
  eti_unit_cost_nonneg: 'Unit material cost cannot be negative.',
  eti_waste_range: 'Waste must be between 0% and 100%.',
  eti_hours_nonneg: 'Labor hours cannot be negative.',
  eti_modifier_range: 'The labor factor must be greater than zero and no more than 10.',
  eti_override_has_original: 'An overridden cost must record the original cost it replaced.',
  materials_unit_cost_nonneg: 'Unit cost cannot be negative.',
  materials_waste_range: 'Waste must be between 0% and 100%.',
  labor_rates_base_rate_nonneg: 'The burdened hourly rate cannot be negative.',
  labor_modifiers_factor_range: 'The factor must be greater than zero and no more than 10.',
  esi_allowance_nonneg: 'An allowance amount cannot be negative.',
  jobs_contract_nonneg: 'The contract value cannot be negative.',
};

/** Foreign keys, phrased as what the estimator did rather than as SQL. */
const FOREIGN_KEY_MESSAGES: Record<string, string> = {
  estimate_takeoff_items_labor_rate_id_fkey:
    'The selected labor classification no longer exists. Pick another on the Labor rates page.',
  estimate_takeoff_items_scope_category_id_fkey: 'The selected scope category no longer exists.',
  estimate_takeoff_items_vendor_id_fkey: 'The selected vendor no longer exists.',
  estimate_takeoff_items_equipment_rate_id_fkey: 'The selected equipment rate no longer exists.',
  estimate_takeoff_items_source_material_id_fkey: 'The selected material no longer exists.',
  estimate_takeoff_items_estimate_id_fkey: 'That estimate no longer exists.',
  estimates_project_id_fkey: 'That project no longer exists.',
  materials_preferred_vendor_id_fkey: 'The selected preferred vendor no longer exists.',
  materials_default_labor_rate_id_fkey:
    'The selected default labor classification no longer exists.',
  materials_category_id_fkey: 'The selected material category no longer exists.',
  assembly_items_assembly_id_fkey: 'That assembly no longer exists.',
  assembly_items_material_id_fkey: 'The selected material no longer exists.',
  assembly_items_labor_rate_id_fkey: 'The selected labor classification no longer exists.',
  jobs_source_estimate_id_fkey: 'That estimate no longer exists.',
  jobs_project_id_fkey: 'That project no longer exists.',
  project_documents_project_id_fkey: 'That project no longer exists.',
};

function constraintName(error: PostgrestError): string | null {
  // PostgREST puts the constraint name in `message` and usually in `details`.
  const source = `${error.message ?? ''} ${error.details ?? ''}`;
  const quoted = /"([a-z0-9_]+)"/i.exec(source);
  return quoted ? quoted[1] : null;
}

/**
 * Translate a Postgres/PostgREST error into a message that helps the estimator
 * fix the problem, without leaking schema internals or connection details.
 * The raw error is logged server-side by the caller.
 */
export function describeDbError(error: PostgrestError, fallback: string): string {
  const name = constraintName(error);

  if (error.code === '23505') {
    return (name && CONSTRAINT_MESSAGES[name]) || 'That record already exists.';
  }
  if (error.code === '23503') {
    return (
      (name && FOREIGN_KEY_MESSAGES[name]) ||
      'A record this depends on no longer exists. Refresh the page and try again.'
    );
  }
  if (error.code === '23514') {
    return (
      (name && CONSTRAINT_MESSAGES[name]) ||
      'One of the submitted values is outside the range the system allows.'
    );
  }
  if (error.code === '23502') {
    return 'A required value was missing.';
  }
  if (error.code === 'PGRST116') {
    return 'That record was not found.';
  }
  // Anything that is really an infrastructure fault rather than a bad value
  // shares its wording with the read paths, so both say the same thing.
  const infrastructure = classifyDbError(error);
  if (infrastructure.kind !== 'database') return infrastructure.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

/**
 * Why a Supabase call failed, at the granularity that changes what an operator
 * has to DO about it. The distinction that matters most in practice is
 * `invalid-credentials` (Supabase refused the key) versus
 * `insufficient-privileges` (Supabase accepted the key, Postgres refused the
 * query) — those look identical in the UI but have completely different fixes.
 */
export type DbFailureKind =
  | 'not-configured'
  | 'invalid-credentials'
  | 'insufficient-privileges'
  | 'missing-relation'
  | 'network'
  | 'database';

export type DbFailure = {
  kind: DbFailureKind;
  /** Safe to render in the browser: no schema internals, no connection detail. */
  message: string;
};

type ErrorFields = {
  name?: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

/** Pull the PostgREST/Error fields we care about off an unknown thrown value. */
function readErrorFields(error: unknown): ErrorFields {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '') };
  }
  const source = error as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
  const num = (value: unknown) => (typeof value === 'number' ? value : undefined);
  // `fetch failed` hides the real cause (ENOTFOUND, ECONNREFUSED) one level down.
  const cause = source.cause as Record<string, unknown> | undefined;
  return {
    name: str(source.name),
    message: str(source.message) ?? String(error),
    code: str(source.code) ?? (cause ? str(cause.code) : undefined),
    details: str(source.details),
    hint: str(source.hint),
    status: num(source.status) ?? num(source.statusCode),
  };
}

const NETWORK_CODES =
  /^(ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|EPIPE|UND_ERR_[A-Z_]+)$/;

/**
 * Classify a thrown value into the fault it actually represents.
 *
 * Order matters: a transport failure carries no PostgREST code, and a rejected
 * key must be told apart from a rejected query before either is reported as a
 * generic database error.
 */
export function classifyDbError(error: unknown): DbFailure {
  if (error instanceof EstimatingConfigError) {
    return {
      kind: 'not-configured',
      message:
        'The estimating database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment, then redeploy.',
    };
  }

  const { name, message, code, details, hint, status } = readErrorFields(error);
  const text = `${message} ${details ?? ''} ${hint ?? ''}`;

  // --- transport: never reached PostgREST at all ---------------------------
  if (
    name === 'AbortError' ||
    (code && NETWORK_CODES.test(code)) ||
    /fetch failed|network request failed|load failed|socket hang up|getaddrinfo|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timed? ?out/i.test(
      text,
    )
  ) {
    return {
      kind: 'network',
      message:
        'The estimating database could not be reached. Check SUPABASE_URL and that the Supabase project is running.',
    };
  }

  // --- the gateway refused the key -----------------------------------------
  if (
    status === 401 ||
    code === 'PGRST301' ||
    code === '401' ||
    /invalid api key|no api key found|api key (is )?(invalid|expired)|jw[st]\w*error|jwt (expired|malformed|invalid)|invalid (jwt|claim|signature)/i.test(
      text,
    )
  ) {
    return {
      kind: 'invalid-credentials',
      message:
        'Supabase rejected the API key. Check that SUPABASE_SERVICE_ROLE_KEY is the current service-role key for this project.',
    };
  }

  // --- Postgres accepted the connection and refused the query ---------------
  if (code === '42501' || /permission denied/i.test(text)) {
    return {
      kind: 'insufficient-privileges',
      message:
        'The database accepted the connection but refused the query: the role in use has no privileges on the estimating tables. Either SUPABASE_SERVICE_ROLE_KEY is not the service-role key, or the service_role grants were revoked in Postgres.',
    };
  }
  if (/row-level security/i.test(text)) {
    return {
      kind: 'insufficient-privileges',
      message:
        'A row-level security policy blocked the request. The estimating tables expect to be reached with the service-role key, which bypasses RLS.',
    };
  }

  // --- the table or the schema cache is missing -----------------------------
  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist|could not find the table/i.test(text)
  ) {
    return {
      kind: 'missing-relation',
      message:
        'The estimating tables are missing. Apply migrations 003-005 in supabase/migrations.',
    };
  }

  return {
    kind: 'database',
    message: 'The estimating data could not be loaded. The database returned an error.',
  };
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/** Strip the service-role key out of anything about to be logged. */
function scrub(value: string | undefined): string | undefined {
  if (!value) return value;
  const key = serviceKey();
  return key ? value.split(key).join('[redacted]') : value;
}

/**
 * Log a database failure with everything needed to diagnose it and nothing that
 * could compromise the project: no API key, no Authorization header, no JWT, no
 * cookies, no request body, no environment dump. The project ref is public.
 */
export function logDbError(context: string, error: unknown, kind?: DbFailureKind): void {
  const { message, code, details, hint, status } = readErrorFields(error);
  console.error(`[estimating-db] ${context} failed`, {
    kind: kind ?? classifyDbError(error).kind,
    code,
    message: scrub(message),
    details: scrub(details),
    hint: scrub(hint),
    status,
    projectRef: supabaseProjectRef(),
    serviceRoleConfigured: !!serviceKey(),
  });
}

/**
 * Log a database failure and return the message to show the browser.
 *
 * This is the seam the read paths were missing: every admin page caught its
 * error, rendered a fallback and dropped the error object on the floor, so a
 * production failure left no trace in the server logs at all.
 */
export function reportDbFailure(context: string, error: unknown): DbFailure {
  const failure = classifyDbError(error);
  logDbError(context, error, failure.kind);
  return failure;
}
