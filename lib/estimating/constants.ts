// Shared vocabulary for the estimating system.
//
// Anything an estimator might reasonably want to change over time (scope
// categories, labor classifications, productivity factors, material
// categories) lives in the DATABASE, not here. What lives here is the fixed
// structural vocabulary the code itself branches on — statuses, line types,
// dispositions — plus the seed text for a new estimate's bid checklist.

export const PROJECT_STATUSES = [
  'draft',
  'bidding',
  'submitted',
  'revision_requested',
  'awarded',
  'lost',
  'cancelled',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  bidding: 'Bidding',
  submitted: 'Submitted',
  revision_requested: 'Revision requested',
  awarded: 'Awarded',
  lost: 'Lost',
  cancelled: 'Cancelled',
};

export const ESTIMATE_STATUSES = [
  'draft',
  'ready_for_review',
  'approved_internal',
  'submitted',
  'awarded',
  'lost',
  'superseded',
] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const ESTIMATE_STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  approved_internal: 'Approved (internal)',
  submitted: 'Submitted',
  awarded: 'Awarded',
  lost: 'Lost',
  superseded: 'Superseded',
};

/** Statuses that mean "this revision is finished" — editing is blocked. */
export const LOCKED_ESTIMATE_STATUSES: readonly EstimateStatus[] = ['superseded'];

export const JOB_STATUSES = [
  'planning',
  'active',
  'on_hold',
  'complete',
  'closed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On hold',
  complete: 'Complete',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const UNITS_OF_MEASURE = [
  'EA',
  'LF',
  'SF',
  'SY',
  'CF',
  'CY',
  'LB',
  'TON',
  'GAL',
  'BOX',
  'ROLL',
  'SET',
  'PR',
  'LOT',
  'HR',
  'DAY',
] as const;
export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];

export const EQUIPMENT_UNITS = ['DAY', 'WEEK', 'MONTH', 'EA', 'LOT', 'HR'] as const;
export type EquipmentUnit = (typeof EQUIPMENT_UNITS)[number];

export const LABOR_UNIT_TYPES = [
  'hours_per_unit',
  'hours_per_100_units',
  'hours_per_1000_units',
] as const;
export type LaborUnitType = (typeof LABOR_UNIT_TYPES)[number];

export const LABOR_UNIT_TYPE_LABELS: Record<LaborUnitType, string> = {
  hours_per_unit: 'Hours per unit',
  hours_per_100_units: 'Hours per 100 units',
  hours_per_1000_units: 'Hours per 1,000 units',
};

/** Divisor that converts a labor unit into plain hours-per-one-unit. */
export const LABOR_UNIT_DIVISOR: Record<LaborUnitType, number> = {
  hours_per_unit: 1,
  hours_per_100_units: 100,
  hours_per_1000_units: 1000,
};

export const TAKEOFF_LINE_TYPES = [
  'material',
  'assembly',
  'assembly_component',
  'labor',
  'equipment',
  'subcontract',
  'allowance',
  'lump_sum',
  'other',
] as const;
export type TakeoffLineType = (typeof TAKEOFF_LINE_TYPES)[number];

export const TAKEOFF_LINE_TYPE_LABELS: Record<TakeoffLineType, string> = {
  material: 'Material',
  assembly: 'Assembly',
  assembly_component: 'Assembly component',
  labor: 'Labor',
  equipment: 'Equipment',
  subcontract: 'Subcontract',
  allowance: 'Allowance',
  lump_sum: 'Lump sum',
  other: 'Other',
};

/** Line types an estimator can create directly (assembly_component is derived). */
export const CREATABLE_LINE_TYPES: readonly TakeoffLineType[] = [
  'material',
  'labor',
  'equipment',
  'subcontract',
  'allowance',
  'lump_sum',
  'other',
];

export const TAKEOFF_DISPOSITIONS = ['included', 'excluded', 'alternate', 'allowance'] as const;
export type TakeoffDisposition = (typeof TAKEOFF_DISPOSITIONS)[number];

export const TAKEOFF_DISPOSITION_LABELS: Record<TakeoffDisposition, string> = {
  included: 'Included in base bid',
  excluded: 'Excluded (documented, not priced)',
  alternate: 'Alternate (priced separately)',
  allowance: 'Allowance (carried in base bid)',
};

/**
 * Which dispositions contribute to the base-bid direct cost.
 * `excluded` is documented but never priced; `alternate` is totalled
 * separately so it can be presented as an add/deduct.
 */
export const BASE_BID_DISPOSITIONS: readonly TakeoffDisposition[] = ['included', 'allowance'];

export const SCOPE_DISPOSITIONS = [
  'included',
  'excluded',
  'clarification',
  'assumption',
  'alternate',
  'allowance',
] as const;
export type ScopeDisposition = (typeof SCOPE_DISPOSITIONS)[number];

export const SCOPE_DISPOSITION_LABELS: Record<ScopeDisposition, string> = {
  included: 'Inclusion',
  excluded: 'Exclusion',
  clarification: 'Clarification',
  assumption: 'Assumption',
  alternate: 'Alternate',
  allowance: 'Allowance',
};

export const PRICING_MODES = ['margin', 'markup', 'fixed'] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

export const PRICING_MODE_LABELS: Record<PricingMode, string> = {
  margin: 'Target gross margin',
  markup: 'Markup on cost',
  fixed: 'Fixed sell price',
};

export const CHECKLIST_ANSWERS = ['yes', 'no', 'na', 'needs_review'] as const;
export type ChecklistAnswer = (typeof CHECKLIST_ANSWERS)[number];

export const CHECKLIST_ANSWER_LABELS: Record<ChecklistAnswer, string> = {
  yes: 'Yes',
  no: 'No',
  na: 'N/A',
  needs_review: 'Needs review',
};

export const DOCUMENT_CATEGORIES = [
  'plans',
  'specifications',
  'equipment_schedule',
  'addendum',
  'vendor_quote',
  'subcontractor_quote',
  'photo',
  'other',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  plans: 'Plans / drawings',
  specifications: 'Specifications',
  equipment_schedule: 'Equipment schedule',
  addendum: 'Addendum',
  vendor_quote: 'Vendor quote',
  subcontractor_quote: 'Subcontractor quote',
  photo: 'Photo',
  other: 'Other',
};

export const VENDOR_CATEGORIES = [
  'controls',
  'electrical',
  'insulation',
  'tab',
  'crane_rigging',
  'roofing',
  'fire_stopping',
  'core_drilling',
  'equipment_supplier',
  'sheet_metal_supplier',
  'plumbing_supplier',
  'mechanical_equipment_supplier',
  'general',
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  controls: 'Controls',
  electrical: 'Electrical',
  insulation: 'Insulation',
  tab: 'Testing & Balancing',
  crane_rigging: 'Crane / Rigging',
  roofing: 'Roofing',
  fire_stopping: 'Fire stopping',
  core_drilling: 'Concrete / Core drilling',
  equipment_supplier: 'Equipment supplier',
  sheet_metal_supplier: 'Sheet metal supplier',
  plumbing_supplier: 'Plumbing supplier',
  mechanical_equipment_supplier: 'Mechanical equipment supplier',
  general: 'General',
};

export const PROJECT_TYPES = [
  'new_construction',
  'renovation',
  'tenant_fitout',
  'equipment_replacement',
  'design_build',
  'service_upgrade',
  'other',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  new_construction: 'New construction',
  renovation: 'Renovation',
  tenant_fitout: 'Tenant fit-out',
  equipment_replacement: 'Equipment replacement',
  design_build: 'Design-build',
  service_upgrade: 'Service upgrade',
  other: 'Other',
};

/**
 * Bid review checklist seeded onto every new estimate.
 *
 * `critical` items are the ones that most often lose money on a commercial
 * mechanical bid when they are missed. They gate the "Ready for review"
 * status transition — a draft always saves regardless.
 */
export type ChecklistTemplateItem = {
  code: string;
  prompt: string;
  category: string;
  critical: boolean;
};

export const BID_CHECKLIST_TEMPLATE: readonly ChecklistTemplateItem[] = [
  {
    code: 'crane_rigging',
    prompt: 'Crane / rigging included?',
    category: 'Site & access',
    critical: true,
  },
  { code: 'controls', prompt: 'Controls included?', category: 'Scope', critical: true },
  { code: 'electrical', prompt: 'Electrical included?', category: 'Scope', critical: true },
  { code: 'tab', prompt: 'Testing & balancing included?', category: 'Scope', critical: true },
  { code: 'permits', prompt: 'Permits included?', category: 'Commercial', critical: true },
  {
    code: 'roof_cut_patch',
    prompt: 'Roof cutting / patching included?',
    category: 'Site & access',
    critical: false,
  },
  { code: 'fire_stopping', prompt: 'Fire stopping included?', category: 'Scope', critical: false },
  { code: 'core_drilling', prompt: 'Core drilling included?', category: 'Scope', critical: false },
  { code: 'engineering', prompt: 'Engineering included?', category: 'Scope', critical: false },
  { code: 'freight', prompt: 'Freight included?', category: 'Commercial', critical: false },
  { code: 'delivery', prompt: 'Delivery included?', category: 'Commercial', critical: false },
  { code: 'sales_tax', prompt: 'Sales tax included?', category: 'Commercial', critical: true },
  {
    code: 'prevailing_wage',
    prompt: 'Prevailing wage addressed?',
    category: 'Commercial',
    critical: true,
  },
  { code: 'bonding', prompt: 'Bonding addressed?', category: 'Commercial', critical: true },
  {
    code: 'perf_payment_bond',
    prompt: 'Performance / payment bond required?',
    category: 'Commercial',
    critical: false,
  },
  {
    code: 'after_hours',
    prompt: 'After-hours work addressed?',
    category: 'Schedule',
    critical: false,
  },
  { code: 'startup', prompt: 'Startup included?', category: 'Scope', critical: false },
  { code: 'commissioning', prompt: 'Commissioning included?', category: 'Scope', critical: false },
  {
    code: 'warranty_labor',
    prompt: 'Warranty labor included?',
    category: 'Commercial',
    critical: false,
  },
  { code: 'disposal', prompt: 'Disposal included?', category: 'Site & access', critical: false },
  { code: 'temp_hvac', prompt: 'Temporary HVAC included?', category: 'Scope', critical: false },
  { code: 'insulation', prompt: 'Insulation included?', category: 'Scope', critical: false },
  {
    code: 'bms_integration',
    prompt: 'BMS integration included?',
    category: 'Scope',
    critical: false,
  },
  {
    code: 'lead_times',
    prompt: 'Equipment lead times reviewed?',
    category: 'Procurement',
    critical: true,
  },
  {
    code: 'long_lead',
    prompt: 'Long-lead items identified?',
    category: 'Procurement',
    critical: false,
  },
  { code: 'addenda', prompt: 'Addenda reviewed?', category: 'Documents', critical: true },
  { code: 'exclusions', prompt: 'Exclusions documented?', category: 'Documents', critical: true },
];

/** Max upload size for a bid document (25 MB). */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/** Default page size for the material price book and other long catalogs. */
export const CATALOG_PAGE_SIZE = 50;

// NOTE: this module is imported by client components, so it must not read
// server-only environment variables. The documents bucket name lives in
// lib/estimating/actions/documents.ts instead.
