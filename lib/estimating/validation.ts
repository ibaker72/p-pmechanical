// Zod schemas for every estimating mutation.
//
// These run SERVER-SIDE on every write. Client-side hints are a convenience;
// the server never trusts a submitted total, a computed price, or a foreign key
// it has not re-checked.

import { z } from 'zod';
import {
  CHECKLIST_ANSWERS,
  DOCUMENT_CATEGORIES,
  EQUIPMENT_UNITS,
  ESTIMATE_STATUSES,
  JOB_STATUSES,
  LABOR_UNIT_TYPES,
  PRICING_MODES,
  PROJECT_STATUSES,
  SCOPE_DISPOSITIONS,
  TAKEOFF_DISPOSITIONS,
  TAKEOFF_LINE_TYPES,
  UNITS_OF_MEASURE,
} from './constants';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Trimmed string; '' becomes null so empty inputs do not store blanks. */
const optionalText = z
  .string()
  .transform((v) => {
    const trimmed = v.trim();
    return trimmed === '' ? null : trimmed;
  })
  .nullable()
  .catch(null);

const requiredText = (label: string, max = 500) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, `${label} is required`).max(max, `${label} is too long`));

const optionalUuid = z
  .string()
  .transform((v) => (v.trim() === '' ? null : v.trim()))
  .nullable()
  .refine(
    (v) => v === null || z.string().uuid().safeParse(v).success,
    'Not a valid record reference',
  );

const requiredUuid = z.string().uuid('Not a valid record reference');

/** Money/quantity input. Rejects NaN, Infinity and negatives by default. */
const nonNegativeNumber = (label: string, max = 1_000_000_000) =>
  z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? v : v.replace(/[$,\s]/g, '').trim()))
    .transform((v) => (v === '' ? 0 : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a number` })
        .finite(`${label} must be a number`)
        .min(0, `${label} cannot be negative`)
        .max(max, `${label} is unrealistically large`),
    );

/** Same as above but negatives are allowed (credits, deduct alternates). */
const signedNumber = (label: string, max = 1_000_000_000) =>
  z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? v : v.replace(/[$,\s]/g, '').trim()))
    .transform((v) => (v === '' ? 0 : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a number` })
        .finite(`${label} must be a number`)
        .min(-max, `${label} is unrealistically large`)
        .max(max, `${label} is unrealistically large`),
    );

const optionalSignedNumber = (label: string) =>
  z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? String(v) : v.replace(/[$,\s]/g, '').trim()))
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a number` })
        .finite(`${label} must be a number`)
        .min(-1_000_000_000)
        .max(1_000_000_000)
        .nullable(),
    );

const percentField = (label: string, max = 100) =>
  z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? v : v.replace(/[%,\s]/g, '').trim()))
    .transform((v) => (v === '' ? 0 : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a number` })
        .finite(`${label} must be a number`)
        .min(0, `${label} cannot be negative`)
        .max(max, `${label} cannot exceed ${max}%`),
    );

const factorField = z
  .string()
  .or(z.number())
  .transform((v) => (typeof v === 'number' ? v : v.trim()))
  .transform((v) => (v === '' ? 1 : Number(v)))
  .pipe(
    z
      .number({ invalid_type_error: 'Factor must be a number' })
      .finite('Factor must be a number')
      .gt(0, 'Factor must be greater than zero')
      .max(10, 'Factor cannot exceed 10'),
  );

const optionalInt = (label: string, max = 1_000_000) =>
  z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? String(v) : v.replace(/[,\s]/g, '').trim()))
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: `${label} must be a whole number` })
        .int(`${label} must be a whole number`)
        .min(0, `${label} cannot be negative`)
        .max(max, `${label} is unrealistically large`)
        .nullable(),
    );

const optionalDate = z
  .string()
  .transform((v) => (v.trim() === '' ? null : v.trim()))
  .nullable()
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Enter a valid date')
  .refine((v) => v === null || !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Enter a valid date');

const optionalDateTime = z
  .string()
  .transform((v) => (v.trim() === '' ? null : v.trim()))
  .nullable()
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), 'Enter a valid date and time')
  .transform((v) => (v === null ? null : new Date(v).toISOString()));

const optionalEmail = z
  .string()
  .transform((v) => (v.trim() === '' ? null : v.trim()))
  .nullable()
  .refine(
    (v) => v === null || z.string().email().safeParse(v).success,
    'Enter a valid email address',
  );

const checkbox = z
  .union([z.boolean(), z.string(), z.undefined(), z.null()])
  .transform((v) => v === true || v === 'on' || v === 'true' || v === '1');

const sortOrder = z
  .string()
  .or(z.number())
  .transform((v) => (typeof v === 'number' ? v : v.trim()))
  .transform((v) => (v === '' ? 0 : Number(v)))
  .pipe(z.number().int().min(0).max(1_000_000));

const codeField = (label: string) =>
  z
    .string()
    .transform((v) =>
      v
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_'),
    )
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(64, `${label} is too long`)
        .regex(/^[a-z0-9_]+$/, `${label} may only contain letters, numbers and underscores`),
    );

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  password: z.string().min(1, 'Enter the admin password'),
  next: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  name: requiredText('Project name', 200),
  project_number: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().max(50, 'Project number is too long')),
  customer_company: optionalText,
  customer_contact_name: optionalText,
  customer_email: optionalEmail,
  customer_phone: optionalText,
  address_line1: optionalText,
  address_line2: optionalText,
  city: optionalText,
  state: optionalText,
  postal_code: optionalText,
  project_type: optionalText,
  square_footage: optionalInt('Square footage', 100_000_000),
  floors: optionalInt('Number of floors', 500),
  bid_due_at: optionalDateTime,
  anticipated_start_date: optionalDate,
  anticipated_completion_date: optionalDate,
  estimator: optionalText,
  status: z.enum(PROJECT_STATUSES),
  prevailing_wage: checkbox,
  tax_exempt: checkbox,
  bond_required: checkbox,
  occupied_building: checkbox,
  after_hours_work: checkbox,
  notes: optionalText,
});
export type ProjectInput = z.infer<typeof projectSchema>;

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------

export const estimateCreateSchema = z.object({
  project_id: requiredUuid,
  estimate_number: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().max(60, 'Estimate number is too long')),
  revision_label: optionalText,
  estimator: optionalText,
  bid_date: optionalDate,
  expiration_date: optionalDate,
  internal_notes: optionalText,
});
export type EstimateCreateInput = z.infer<typeof estimateCreateSchema>;

export const estimateDetailsSchema = z.object({
  estimate_id: requiredUuid,
  estimate_number: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().min(1, 'Estimate number is required').max(60)),
  revision_label: optionalText,
  estimator: optionalText,
  bid_date: optionalDate,
  expiration_date: optionalDate,
  internal_notes: optionalText,
  customer_notes: optionalText,
});

export const estimatePricingSchema = z.object({
  estimate_id: requiredUuid,
  overhead_percent: percentField('Overhead', 500),
  contingency_percent: percentField('Contingency', 500),
  pricing_mode: z.enum(PRICING_MODES),
  markup_percent: percentField('Markup', 1000),
  target_margin_percent: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? v : v.replace(/[%,\s]/g, '').trim()))
    .transform((v) => (v === '' ? 0 : Number(v)))
    .pipe(
      z
        .number({ invalid_type_error: 'Gross margin must be a number' })
        .finite('Gross margin must be a number')
        .min(0, 'Gross margin cannot be negative')
        // 100% margin implies an infinite sell price.
        .lt(100, 'Gross margin must be less than 100%'),
    ),
  fixed_sell_price: optionalSignedNumber('Fixed sell price').refine(
    (v) => v === null || v >= 0,
    'Fixed sell price cannot be negative',
  ),
  other_direct_cost: nonNegativeNumber('Other direct cost'),
  other_direct_cost_notes: optionalText,
  sales_tax_percent: percentField('Sales tax'),
});

export const estimateStatusSchema = z.object({
  estimate_id: requiredUuid,
  status: z.enum(ESTIMATE_STATUSES),
  /** Set when the estimator has seen and accepted the unresolved-item warning. */
  acknowledge_unresolved: checkbox,
});

export const estimateRevisionSchema = z.object({
  estimate_id: requiredUuid,
  revision_label: optionalText,
  supersede_source: checkbox,
});

// ---------------------------------------------------------------------------
// Takeoff
// ---------------------------------------------------------------------------

const takeoffCore = {
  scope_category_id: optionalUuid,
  line_type: z.enum(TAKEOFF_LINE_TYPES),
  description: requiredText('Description', 500),
  customer_description: optionalText,
  quantity: nonNegativeNumber('Quantity'),
  unit: z.enum(UNITS_OF_MEASURE),
  unit_material_cost: nonNegativeNumber('Unit material cost'),
  material_waste_percent: percentField('Waste'),
  labor_hours_per_unit: nonNegativeNumber('Labor hours per unit', 100_000),
  labor_rate_id: optionalUuid,
  labor_modifier_factor: factorField,
  apply_estimate_conditions: checkbox,
  equipment_cost: nonNegativeNumber('Equipment cost'),
  subcontract_cost: nonNegativeNumber('Subcontract cost'),
  other_cost: signedNumber('Other cost'),
  vendor_id: optionalUuid,
  equipment_rate_id: optionalUuid,
  disposition: z.enum(TAKEOFF_DISPOSITIONS),
  is_taxable: checkbox,
  internal_notes: optionalText,
  override_reason: optionalText,
};

export const takeoffCreateSchema = z.object({
  estimate_id: requiredUuid,
  ...takeoffCore,
});
export type TakeoffCreateInput = z.infer<typeof takeoffCreateSchema>;

export const takeoffUpdateSchema = z.object({
  item_id: requiredUuid,
  ...takeoffCore,
});

/** Fast inline edit from the takeoff grid — quantity and unit cost only. */
export const takeoffQuickEditSchema = z.object({
  item_id: requiredUuid,
  quantity: nonNegativeNumber('Quantity'),
  unit_material_cost: nonNegativeNumber('Unit material cost'),
  override_reason: optionalText,
});

export const takeoffIdSchema = z.object({ item_id: requiredUuid });

export const addMaterialLineSchema = z.object({
  estimate_id: requiredUuid,
  material_id: requiredUuid,
  quantity: nonNegativeNumber('Quantity'),
  scope_category_id: optionalUuid,
  disposition: z.enum(TAKEOFF_DISPOSITIONS).default('included'),
});

export const addAssemblySchema = z.object({
  estimate_id: requiredUuid,
  assembly_id: requiredUuid,
  quantity: nonNegativeNumber('Quantity'),
  scope_category_id: optionalUuid,
  disposition: z.enum(TAKEOFF_DISPOSITIONS).default('included'),
});

export const addEquipmentLineSchema = z.object({
  estimate_id: requiredUuid,
  equipment_rate_id: requiredUuid,
  description: optionalText,
  duration: nonNegativeNumber('Duration', 10_000),
  rate_basis: z.enum(['daily', 'weekly', 'monthly']),
  include_mobilization: checkbox,
  include_delivery: checkbox,
  scope_category_id: optionalUuid,
});

export const addSubcontractLineSchema = z.object({
  estimate_id: requiredUuid,
  vendor_id: optionalUuid,
  description: requiredText('Description', 500),
  amount: nonNegativeNumber('Quoted amount'),
  scope_category_id: optionalUuid,
  disposition: z.enum(TAKEOFF_DISPOSITIONS).default('included'),
  internal_notes: optionalText,
});

// ---------------------------------------------------------------------------
// Scope / narrative sections
// ---------------------------------------------------------------------------

export const scopeItemSchema = z.object({
  estimate_id: requiredUuid,
  scope_category_id: optionalUuid,
  disposition: z.enum(SCOPE_DISPOSITIONS),
  title: requiredText('Title', 300),
  customer_text: optionalText,
  internal_notes: optionalText,
  amount: optionalSignedNumber('Amount'),
  is_uncertain: checkbox,
});

export const scopeItemUpdateSchema = scopeItemSchema.omit({ estimate_id: true }).extend({
  scope_item_id: requiredUuid,
});

export const scopeItemIdSchema = z.object({ scope_item_id: requiredUuid });

export const scopeReorderSchema = z.object({
  scope_item_id: requiredUuid,
  direction: z.enum(['up', 'down']),
});

// ---------------------------------------------------------------------------
// Labor conditions
// ---------------------------------------------------------------------------

export const laborConditionAddSchema = z.object({
  estimate_id: requiredUuid,
  labor_modifier_id: requiredUuid,
  /** Estimators may tune the snapshotted factor for this bid. */
  factor: factorField,
  note: optionalText,
});

export const laborConditionUpdateSchema = z.object({
  condition_id: requiredUuid,
  factor: factorField,
  note: optionalText,
});

export const laborConditionIdSchema = z.object({ condition_id: requiredUuid });

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export const checklistUpdateSchema = z.object({
  checklist_item_id: requiredUuid,
  answer: z.enum(CHECKLIST_ANSWERS),
  note: optionalText,
});

// ---------------------------------------------------------------------------
// Catalog: materials, labor rates, modifiers, equipment, vendors, scopes
// ---------------------------------------------------------------------------

export const materialSchema = z.object({
  sku: optionalText,
  category_id: optionalUuid,
  subcategory: optionalText,
  name: requiredText('Name', 200),
  description: optionalText,
  manufacturer: optionalText,
  model: optionalText,
  unit_of_measure: z.enum(UNITS_OF_MEASURE),
  unit_cost: nonNegativeNumber('Unit cost'),
  preferred_vendor_id: optionalUuid,
  waste_percent: percentField('Waste'),
  default_labor_unit: nonNegativeNumber('Labor unit', 100_000),
  labor_unit_type: z.enum(LABOR_UNIT_TYPES),
  default_labor_rate_id: optionalUuid,
  is_taxable: checkbox,
  is_active: checkbox,
  notes: optionalText,
});
export type MaterialInput = z.infer<typeof materialSchema>;

export const materialUpdateSchema = materialSchema.extend({ material_id: requiredUuid });
export const materialIdSchema = z.object({ material_id: requiredUuid });

export const materialCostUpdateSchema = z.object({
  material_id: requiredUuid,
  unit_cost: nonNegativeNumber('Unit cost'),
});

export const laborRateSchema = z.object({
  code: codeField('Code'),
  name: requiredText('Name', 150),
  description: optionalText,
  base_hourly_rate: nonNegativeNumber('Burdened hourly rate', 10_000),
  overtime_multiplier: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? v : v.trim()))
    .transform((v) => (v === '' ? 1.5 : Number(v)))
    .pipe(z.number().finite().min(1, 'Overtime multiplier cannot be below 1').max(10)),
  doubletime_multiplier: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === 'number' ? v : v.trim()))
    .transform((v) => (v === '' ? 2 : Number(v)))
    .pipe(z.number().finite().min(1, 'Double-time multiplier cannot be below 1').max(10)),
  prevailing_wage_hourly_rate: optionalSignedNumber('Prevailing wage rate').refine(
    (v) => v === null || v >= 0,
    'Prevailing wage rate cannot be negative',
  ),
  notes: optionalText,
  is_active: checkbox,
  sort_order: sortOrder,
});
export const laborRateUpdateSchema = laborRateSchema.extend({ labor_rate_id: requiredUuid });
export const laborRateIdSchema = z.object({ labor_rate_id: requiredUuid });

export const laborModifierSchema = z.object({
  code: codeField('Code'),
  name: requiredText('Name', 150),
  description: optionalText,
  category: optionalText,
  factor: factorField,
  notes: optionalText,
  is_active: checkbox,
  sort_order: sortOrder,
});
export const laborModifierUpdateSchema = laborModifierSchema.extend({
  labor_modifier_id: requiredUuid,
});
export const laborModifierIdSchema = z.object({ labor_modifier_id: requiredUuid });

export const equipmentRateSchema = z.object({
  code: optionalText,
  name: requiredText('Name', 150),
  category: optionalText,
  unit: z.enum(EQUIPMENT_UNITS),
  daily_rate: nonNegativeNumber('Daily rate'),
  weekly_rate: nonNegativeNumber('Weekly rate'),
  monthly_rate: nonNegativeNumber('Monthly rate'),
  mobilization_cost: nonNegativeNumber('Mobilization cost'),
  delivery_cost: nonNegativeNumber('Delivery cost'),
  pickup_cost: nonNegativeNumber('Pickup cost'),
  vendor_id: optionalUuid,
  notes: optionalText,
  is_active: checkbox,
});
export const equipmentRateUpdateSchema = equipmentRateSchema.extend({
  equipment_rate_id: requiredUuid,
});
export const equipmentRateIdSchema = z.object({ equipment_rate_id: requiredUuid });

export const vendorSchema = z.object({
  company_name: requiredText('Company name', 200),
  category: optionalText,
  contact_name: optionalText,
  email: optionalEmail,
  phone: optionalText,
  website: optionalText,
  address_line1: optionalText,
  city: optionalText,
  state: optionalText,
  postal_code: optionalText,
  is_supplier: checkbox,
  is_subcontractor: checkbox,
  is_active: checkbox,
  notes: optionalText,
});
export const vendorUpdateSchema = vendorSchema.extend({ vendor_id: requiredUuid });
export const vendorIdSchema = z.object({ vendor_id: requiredUuid });

export const scopeCategorySchema = z.object({
  code: codeField('Code'),
  name: requiredText('Name', 150),
  description: optionalText,
  sort_order: sortOrder,
  is_active: checkbox,
});
export const scopeCategoryUpdateSchema = scopeCategorySchema.extend({
  scope_category_id: requiredUuid,
});

export const materialCategorySchema = z.object({
  code: codeField('Code'),
  name: requiredText('Name', 150),
  parent_id: optionalUuid,
  sort_order: sortOrder,
  is_active: checkbox,
});

// ---------------------------------------------------------------------------
// Assemblies
// ---------------------------------------------------------------------------

export const assemblySchema = z.object({
  code: optionalText,
  name: requiredText('Name', 200),
  description: optionalText,
  scope_category_id: optionalUuid,
  unit: z.enum(UNITS_OF_MEASURE),
  notes: optionalText,
  is_active: checkbox,
});
export const assemblyUpdateSchema = assemblySchema.extend({ assembly_id: requiredUuid });
export const assemblyIdSchema = z.object({ assembly_id: requiredUuid });

export const assemblyItemSchema = z.object({
  assembly_id: requiredUuid,
  item_type: z.enum(['material', 'labor', 'equipment', 'subcontract', 'other']),
  material_id: optionalUuid,
  labor_rate_id: optionalUuid,
  equipment_rate_id: optionalUuid,
  vendor_id: optionalUuid,
  description: requiredText('Description', 300),
  quantity_per_unit: nonNegativeNumber('Quantity per unit'),
  unit: z.enum(UNITS_OF_MEASURE),
  unit_cost: nonNegativeNumber('Unit cost'),
  waste_percent: percentField('Waste'),
  labor_hours_per_unit: nonNegativeNumber('Labor hours per unit', 100_000),
  notes: optionalText,
});
export const assemblyItemUpdateSchema = assemblyItemSchema
  .omit({ assembly_id: true })
  .extend({ assembly_item_id: requiredUuid });
export const assemblyItemIdSchema = z.object({ assembly_item_id: requiredUuid });

// ---------------------------------------------------------------------------
// Documents & jobs
// ---------------------------------------------------------------------------

export const documentUploadSchema = z.object({
  project_id: requiredUuid,
  estimate_id: optionalUuid,
  category: z.enum(DOCUMENT_CATEGORIES),
  notes: optionalText,
});
export const documentIdSchema = z.object({ document_id: requiredUuid });

export const convertToJobSchema = z.object({
  estimate_id: requiredUuid,
  job_number: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().max(50, 'Job number is too long')),
  name: optionalText,
  start_date: optionalDate,
  notes: optionalText,
});

export const jobStatusSchema = z.object({
  job_id: requiredUuid,
  status: z.enum(JOB_STATUSES),
});

// ---------------------------------------------------------------------------
// FormData helper
// ---------------------------------------------------------------------------

/**
 * Turn FormData into a plain object Zod can parse.
 * Missing checkbox fields stay missing (unchecked boxes are simply absent),
 * which the `checkbox` transform reads as false.
 */
export function formToObject(formData: FormData): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    output[key] = value;
  }
  return output;
}

export type ParsedForm<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

/** Parse FormData with a schema, flattening issues into per-field messages. */
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): ParsedForm<z.infer<T>> {
  const parsed = schema.safeParse(formToObject(formData));
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = parsed.error.issues[0];
  return {
    ok: false,
    error: first ? first.message : 'The submitted values are not valid.',
    fieldErrors,
  };
}
