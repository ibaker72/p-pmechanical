// Row shapes for the estimating tables.
//
// Supabase's PostgREST returns `numeric` columns as JS numbers when they fit
// and as strings when they do not, so every money/rate field is typed
// `Numeric` and must be passed through `dec()` before arithmetic. Never do
// arithmetic on these values directly.

import type {
  ChecklistAnswer,
  DocumentCategory,
  EstimateStatus,
  JobStatus,
  LaborUnitType,
  PricingMode,
  ProjectStatus,
  ScopeDisposition,
  TakeoffDisposition,
  TakeoffLineType,
} from './constants';

/** A Postgres numeric as delivered by PostgREST. Always route through `dec()`. */
export type Numeric = number | string;

export type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Authored = {
  created_by: string | null;
  updated_by: string | null;
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type ScopeCategory = Timestamps &
  Authored & {
    id: string;
    code: string;
    name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  };

export type MaterialCategory = Timestamps &
  Authored & {
    id: string;
    code: string;
    name: string;
    parent_id: string | null;
    sort_order: number;
    is_active: boolean;
  };

export type Vendor = Timestamps &
  Authored & {
    id: string;
    company_name: string;
    category: string | null;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    is_supplier: boolean;
    is_subcontractor: boolean;
    is_active: boolean;
    notes: string | null;
  };

export type LaborRate = Timestamps &
  Authored & {
    id: string;
    code: string;
    name: string;
    description: string | null;
    base_hourly_rate: Numeric;
    overtime_multiplier: Numeric;
    doubletime_multiplier: Numeric;
    prevailing_wage_hourly_rate: Numeric | null;
    notes: string | null;
    is_active: boolean;
    sort_order: number;
  };

export type LaborModifier = Timestamps &
  Authored & {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string | null;
    factor: Numeric;
    notes: string | null;
    is_active: boolean;
    sort_order: number;
  };

export type Material = Timestamps &
  Authored & {
    id: string;
    sku: string | null;
    category_id: string | null;
    subcategory: string | null;
    name: string;
    description: string | null;
    manufacturer: string | null;
    model: string | null;
    unit_of_measure: string;
    unit_cost: Numeric;
    preferred_vendor_id: string | null;
    waste_percent: Numeric;
    default_labor_unit: Numeric;
    labor_unit_type: LaborUnitType;
    default_labor_rate_id: string | null;
    is_taxable: boolean;
    is_active: boolean;
    last_cost_update_at: string | null;
    notes: string | null;
  };

export type MaterialWithRefs = Material & {
  category: Pick<MaterialCategory, 'id' | 'name'> | null;
  preferred_vendor: Pick<Vendor, 'id' | 'company_name'> | null;
  default_labor_rate: Pick<LaborRate, 'id' | 'name' | 'base_hourly_rate'> | null;
};

export type EquipmentRate = Timestamps &
  Authored & {
    id: string;
    code: string | null;
    name: string;
    category: string | null;
    unit: string;
    daily_rate: Numeric;
    weekly_rate: Numeric;
    monthly_rate: Numeric;
    mobilization_cost: Numeric;
    delivery_cost: Numeric;
    pickup_cost: Numeric;
    vendor_id: string | null;
    notes: string | null;
    is_active: boolean;
  };

export type Assembly = Timestamps &
  Authored & {
    id: string;
    code: string | null;
    name: string;
    description: string | null;
    scope_category_id: string | null;
    unit: string;
    version: number;
    notes: string | null;
    is_active: boolean;
  };

export type AssemblyItem = Timestamps & {
  id: string;
  assembly_id: string;
  sort_order: number;
  item_type: 'material' | 'labor' | 'equipment' | 'subcontract' | 'other';
  material_id: string | null;
  labor_rate_id: string | null;
  equipment_rate_id: string | null;
  vendor_id: string | null;
  description: string;
  quantity_per_unit: Numeric;
  unit: string;
  unit_cost: Numeric;
  waste_percent: Numeric;
  labor_hours_per_unit: Numeric;
  notes: string | null;
};

export type AssemblyWithItems = Assembly & {
  items: AssemblyItem[];
  scope_category: Pick<ScopeCategory, 'id' | 'name' | 'code'> | null;
};

// ---------------------------------------------------------------------------
// Projects & estimates
// ---------------------------------------------------------------------------

export type Project = Timestamps &
  Authored & {
    id: string;
    project_number: string;
    name: string;
    customer_company: string | null;
    customer_contact_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    project_type: string | null;
    square_footage: number | null;
    floors: number | null;
    bid_due_at: string | null;
    anticipated_start_date: string | null;
    anticipated_completion_date: string | null;
    estimator: string | null;
    status: ProjectStatus;
    prevailing_wage: boolean;
    tax_exempt: boolean;
    bond_required: boolean;
    occupied_building: boolean;
    after_hours_work: boolean;
    notes: string | null;
  };

export type Estimate = Timestamps &
  Authored & {
    id: string;
    project_id: string;
    parent_estimate_id: string | null;
    estimate_number: string;
    revision: number;
    revision_label: string | null;
    status: EstimateStatus;
    estimator: string | null;
    bid_date: string | null;
    expiration_date: string | null;
    internal_notes: string | null;
    customer_notes: string | null;

    overhead_percent: Numeric;
    contingency_percent: Numeric;
    pricing_mode: PricingMode;
    markup_percent: Numeric;
    target_margin_percent: Numeric;
    fixed_sell_price: Numeric | null;
    other_direct_cost: Numeric;
    other_direct_cost_notes: string | null;
    sales_tax_percent: Numeric;

    material_cost: Numeric;
    labor_cost: Numeric;
    equipment_cost: Numeric;
    subcontractor_cost: Numeric;
    other_cost: Numeric;
    sales_tax_amount: Numeric;
    direct_cost: Numeric;
    overhead_amount: Numeric;
    contingency_amount: Numeric;
    profit_amount: Numeric;
    sell_price: Numeric;
    gross_margin_percent: Numeric;
    effective_markup_percent: Numeric;
    base_labor_hours: Numeric;
    total_labor_hours: Numeric;
    totals_calculated_at: string | null;
  };

export type EstimateWithProject = Estimate & { project: Project };

export type EstimateLaborCondition = Timestamps & {
  id: string;
  estimate_id: string;
  labor_modifier_id: string | null;
  code: string;
  name: string;
  factor: Numeric;
  note: string | null;
  sort_order: number;
};

export type EstimateScopeItem = Timestamps &
  Authored & {
    id: string;
    estimate_id: string;
    scope_category_id: string | null;
    scope_code: string | null;
    scope_name: string | null;
    disposition: ScopeDisposition;
    title: string;
    customer_text: string | null;
    internal_notes: string | null;
    amount: Numeric | null;
    is_uncertain: boolean;
    sort_order: number;
  };

export type TakeoffItem = Timestamps &
  Authored & {
    id: string;
    estimate_id: string;
    scope_category_id: string | null;
    scope_code: string | null;
    scope_name: string | null;
    line_type: TakeoffLineType;
    source_material_id: string | null;
    source_assembly_id: string | null;
    source_assembly_item_id: string | null;
    source_assembly_version: number | null;
    parent_item_id: string | null;
    labor_rate_id: string | null;
    equipment_rate_id: string | null;
    vendor_id: string | null;
    description: string;
    customer_description: string | null;
    quantity: Numeric;
    unit: string;
    unit_material_cost: Numeric;
    material_waste_percent: Numeric;
    labor_hours_per_unit: Numeric;
    labor_rate_snapshot: Numeric;
    labor_rate_name: string | null;
    labor_modifier_factor: Numeric;
    apply_estimate_conditions: boolean;
    equipment_cost: Numeric;
    subcontract_cost: Numeric;
    other_cost: Numeric;
    original_unit_material_cost: Numeric | null;
    is_cost_overridden: boolean;
    override_reason: string | null;
    disposition: TakeoffDisposition;
    is_taxable: boolean;
    internal_notes: string | null;
    sort_order: number;
  };

export type ChecklistItem = Timestamps & {
  id: string;
  estimate_id: string;
  code: string;
  prompt: string;
  category: string | null;
  answer: ChecklistAnswer;
  is_critical: boolean;
  note: string | null;
  sort_order: number;
  updated_by: string | null;
};

// ---------------------------------------------------------------------------
// Documents & jobs
// ---------------------------------------------------------------------------

export type ProjectDocument = Timestamps & {
  id: string;
  project_id: string;
  estimate_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: DocumentCategory;
  notes: string | null;
  uploaded_by: string | null;
};

export type Job = Timestamps &
  Authored & {
    id: string;
    project_id: string;
    source_estimate_id: string | null;
    job_number: string;
    name: string;
    status: JobStatus;
    contract_value: Numeric;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  };

export type JobBudget = Timestamps & {
  id: string;
  job_id: string;
  source_estimate_id: string | null;
  version: number;
  material_budget: Numeric;
  labor_hours_budget: Numeric;
  labor_cost_budget: Numeric;
  equipment_budget: Numeric;
  subcontract_budget: Numeric;
  other_budget: Numeric;
  total_cost_budget: Numeric;
  contract_value: Numeric;
  expected_gross_profit: Numeric;
  expected_gross_margin_percent: Numeric;
  snapshot_at: string;
  notes: string | null;
  created_by: string | null;
};

export type JobWithBudget = Job & {
  project: Pick<Project, 'id' | 'name' | 'project_number' | 'customer_company'> | null;
  budgets: JobBudget[];
};

// ---------------------------------------------------------------------------
// Action results — every mutation returns one of these, never throws to the UI.
// ---------------------------------------------------------------------------

export type ActionSuccess<T = undefined> = { ok: true; data: T };
export type ActionFailure = {
  ok: false;
  /** Message safe to show the estimator. Never contains secrets or raw SQL. */
  error: string;
  /** Field-level messages keyed by form field name, when validation failed. */
  fieldErrors?: Record<string, string>;
};
export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

export function actionOk(): ActionResult<undefined>;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(error: string, fieldErrors?: Record<string, string>): ActionFailure {
  return { ok: false, error, fieldErrors };
}
