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

/**
 * The service-role Supabase client.
 * Throws rather than returning null so a misconfiguration surfaces as one
 * clear error instead of a cascade of "cannot read property of null".
 */
export function estimatingDb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new EstimatingConfigError(
      'The estimating database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  });
  return cached;
}

export function isEstimatingDbConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE)
  );
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
  if (error.code === '42501' || /permission denied/i.test(error.message ?? '')) {
    return 'The database rejected the request. Check that SUPABASE_SERVICE_ROLE_KEY is the project service-role key.';
  }
  if (error.code === '42P01') {
    return 'The estimating tables are missing. Apply migrations 003-005 in supabase/migrations.';
  }
  if (error.code === 'PGRST116') {
    return 'That record was not found.';
  }
  return fallback;
}

/**
 * Log an unexpected server error. Mirrors the console-based logging the rest of
 * the app uses. Never logs the service-role key or request bodies.
 */
export function logDbError(context: string, error: unknown): void {
  const detail =
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: string; code?: string }).message
      : String(error);
  const code =
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
  console.error(`[estimating] ${context}${code ? ` (${code})` : ''}: ${detail}`);
}
