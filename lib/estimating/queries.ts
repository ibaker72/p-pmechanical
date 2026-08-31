// Read paths for the estimating admin.
//
// Performance rule for this file: an estimate detail page issues a small,
// FIXED number of queries regardless of how many takeoff lines it has. The
// reference tables (scope categories, labor rates, labor modifiers) are small
// and bounded, so they are fetched once per page and joined in memory via Maps
// rather than embedded per row. A 2,000-line takeoff costs the same number of
// round trips as a 5-line one.

import { estimatingDb } from './db';
import { CATALOG_PAGE_SIZE } from './constants';
import type {
  Assembly,
  AssemblyItem,
  AssemblyWithItems,
  ChecklistItem,
  EquipmentRate,
  Estimate,
  EstimateLaborCondition,
  EstimateScopeItem,
  EstimateWithProject,
  Job,
  JobBudget,
  LaborModifier,
  LaborRate,
  Material,
  MaterialCategory,
  MaterialWithRefs,
  Project,
  ProjectDocument,
  ScopeCategory,
  TakeoffItem,
  Vendor,
} from './types';

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export async function listScopeCategories(includeInactive = false): Promise<ScopeCategory[]> {
  let query = estimatingDb().from('scope_categories').select('*').order('sort_order');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ScopeCategory[];
}

export async function listLaborRates(includeInactive = false): Promise<LaborRate[]> {
  let query = estimatingDb().from('labor_rates').select('*').order('sort_order').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LaborRate[];
}

export async function listLaborModifiers(includeInactive = false): Promise<LaborModifier[]> {
  let query = estimatingDb().from('labor_modifiers').select('*').order('sort_order').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LaborModifier[];
}

export async function listEquipmentRates(includeInactive = false): Promise<EquipmentRate[]> {
  let query = estimatingDb().from('equipment_rates').select('*').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EquipmentRate[];
}

export async function listVendors(
  options: { includeInactive?: boolean; subcontractorsOnly?: boolean } = {},
): Promise<Vendor[]> {
  let query = estimatingDb().from('vendors').select('*').order('company_name');
  if (!options.includeInactive) query = query.eq('is_active', true);
  if (options.subcontractorsOnly) query = query.eq('is_subcontractor', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Vendor[];
}

export async function listMaterialCategories(): Promise<MaterialCategory[]> {
  const { data, error } = await estimatingDb()
    .from('material_categories')
    .select('*')
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data ?? []) as MaterialCategory[];
}

/** Index a list by id for in-memory joins. */
export function indexById<T extends { id: string }>(rows: readonly T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

// ---------------------------------------------------------------------------
// Material price book (paginated — this table grows without bound)
// ---------------------------------------------------------------------------

export type MaterialListOptions = {
  search?: string;
  categoryId?: string | null;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  pageSize?: number;
};

export async function listMaterials(
  options: MaterialListOptions = {},
): Promise<{ rows: MaterialWithRefs[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, options.pageSize ?? CATALOG_PAGE_SIZE));
  const from = (page - 1) * pageSize;

  let query = estimatingDb()
    .from('materials')
    .select(
      `*,
       category:material_categories(id,name),
       preferred_vendor:vendors(id,company_name),
       default_labor_rate:labor_rates(id,name,base_hourly_rate)`,
      { count: 'exact' },
    )
    .order('name')
    .range(from, from + pageSize - 1);

  const status = options.status ?? 'active';
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (options.categoryId) query = query.eq('category_id', options.categoryId);

  if (options.search && options.search.trim()) {
    // Escape PostgREST's `or` grammar: commas and parentheses would otherwise
    // be read as filter separators.
    const term = options.search.trim().replace(/[,()\\]/g, ' ');
    query = query.or(
      `name.ilike.%${term}%,sku.ilike.%${term}%,manufacturer.ilike.%${term}%,model.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as MaterialWithRefs[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getMaterial(id: string): Promise<Material | null> {
  const { data, error } = await estimatingDb()
    .from('materials')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Material) ?? null;
}

/** Compact list for the "add material to takeoff" picker. */
export async function searchMaterialsForPicker(term: string, limit = 25): Promise<Material[]> {
  let query = estimatingDb()
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(limit);
  if (term.trim()) {
    const safe = term.trim().replace(/[,()\\]/g, ' ');
    query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,model.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Material[];
}

// ---------------------------------------------------------------------------
// Assemblies
// ---------------------------------------------------------------------------

export async function listAssemblies(includeInactive = false): Promise<
  (Assembly & {
    scope_category: Pick<ScopeCategory, 'id' | 'name' | 'code'> | null;
    item_count: number;
  })[]
> {
  let query = estimatingDb()
    .from('assemblies')
    .select('*, scope_category:scope_categories(id,name,code), assembly_items(count)')
    .order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;

  type Row = Assembly & {
    scope_category: Pick<ScopeCategory, 'id' | 'name' | 'code'> | null;
    assembly_items: { count: number }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    item_count: row.assembly_items?.[0]?.count ?? 0,
  }));
}

export async function getAssemblyWithItems(id: string): Promise<AssemblyWithItems | null> {
  const { data, error } = await estimatingDb()
    .from('assemblies')
    .select('*, scope_category:scope_categories(id,name,code), items:assembly_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const assembly = data as unknown as AssemblyWithItems;
  assembly.items = [...(assembly.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return assembly;
}

export async function getAssemblyItem(id: string): Promise<AssemblyItem | null> {
  const { data, error } = await estimatingDb()
    .from('assembly_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AssemblyItem) ?? null;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectListOptions = {
  status?: string | null;
  search?: string;
  limit?: number;
};

export async function listProjects(
  options: ProjectListOptions = {},
): Promise<(Project & { estimate_count: number })[]> {
  let query = estimatingDb()
    .from('projects')
    .select('*, estimates(count)')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200);

  if (options.status) query = query.eq('status', options.status);
  if (options.search && options.search.trim()) {
    const term = options.search.trim().replace(/[,()\\]/g, ' ');
    query = query.or(
      `name.ilike.%${term}%,project_number.ilike.%${term}%,customer_company.ilike.%${term}%,city.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  type Row = Project & { estimates: { count: number }[] | null };
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    estimate_count: row.estimates?.[0]?.count ?? 0,
  }));
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await estimatingDb()
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

export async function listProjectEstimates(projectId: string): Promise<Estimate[]> {
  const { data, error } = await estimatingDb()
    .from('estimates')
    .select('*')
    .eq('project_id', projectId)
    .order('revision', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Estimate[];
}

export async function listProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const { data, error } = await estimatingDb()
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectDocument[];
}

export async function getDocument(id: string): Promise<ProjectDocument | null> {
  const { data, error } = await estimatingDb()
    .from('project_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProjectDocument) ?? null;
}

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------

export type EstimateListOptions = {
  status?: string | null;
  projectId?: string | null;
  search?: string;
  limit?: number;
};

export async function listEstimates(
  options: EstimateListOptions = {},
): Promise<EstimateWithProject[]> {
  let query = estimatingDb()
    .from('estimates')
    .select('*, project:projects(*)')
    .order('updated_at', { ascending: false })
    .limit(options.limit ?? 200);

  if (options.status) query = query.eq('status', options.status);
  if (options.projectId) query = query.eq('project_id', options.projectId);
  if (options.search && options.search.trim()) {
    const term = options.search.trim().replace(/[,()\\]/g, ' ');
    query = query.or(`estimate_number.ilike.%${term}%,revision_label.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as EstimateWithProject[];
}

export async function getEstimate(id: string): Promise<Estimate | null> {
  const { data, error } = await estimatingDb()
    .from('estimates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Estimate) ?? null;
}

export async function getEstimateWithProject(id: string): Promise<EstimateWithProject | null> {
  const { data, error } = await estimatingDb()
    .from('estimates')
    .select('*, project:projects(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as EstimateWithProject) ?? null;
}

export async function listTakeoffItems(estimateId: string): Promise<TakeoffItem[]> {
  const { data, error } = await estimatingDb()
    .from('estimate_takeoff_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as TakeoffItem[];
}

export async function getTakeoffItem(id: string): Promise<TakeoffItem | null> {
  const { data, error } = await estimatingDb()
    .from('estimate_takeoff_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as TakeoffItem) ?? null;
}

export async function listLaborConditions(estimateId: string): Promise<EstimateLaborCondition[]> {
  const { data, error } = await estimatingDb()
    .from('estimate_labor_conditions')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as EstimateLaborCondition[];
}

export async function listScopeItems(estimateId: string): Promise<EstimateScopeItem[]> {
  const { data, error } = await estimatingDb()
    .from('estimate_scope_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('disposition')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as EstimateScopeItem[];
}

export async function getScopeItem(id: string): Promise<EstimateScopeItem | null> {
  const { data, error } = await estimatingDb()
    .from('estimate_scope_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as EstimateScopeItem) ?? null;
}

export async function listChecklistItems(estimateId: string): Promise<ChecklistItem[]> {
  const { data, error } = await estimatingDb()
    .from('estimate_checklist_items')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as ChecklistItem[];
}

export async function countUnresolvedChecklistItems(
  estimateId: string,
): Promise<{ total: number; critical: number }> {
  const db = estimatingDb();
  const [{ count: total, error: totalError }, { count: critical, error: criticalError }] =
    await Promise.all([
      db
        .from('estimate_checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('estimate_id', estimateId)
        .eq('answer', 'needs_review'),
      db
        .from('estimate_checklist_items')
        .select('id', { count: 'exact', head: true })
        .eq('estimate_id', estimateId)
        .eq('answer', 'needs_review')
        .eq('is_critical', true),
    ]);
  if (totalError) throw totalError;
  if (criticalError) throw criticalError;
  return { total: total ?? 0, critical: critical ?? 0 };
}

/**
 * Everything an estimate page needs, in five round trips regardless of size.
 * Reference tables come back alongside so callers can resolve names in memory.
 */
export async function getEstimateBundle(estimateId: string): Promise<{
  estimate: EstimateWithProject;
  items: TakeoffItem[];
  conditions: EstimateLaborCondition[];
  scopeCategories: ScopeCategory[];
  laborRates: LaborRate[];
} | null> {
  const estimate = await getEstimateWithProject(estimateId);
  if (!estimate) return null;

  const [items, conditions, scopeCategories, laborRates] = await Promise.all([
    listTakeoffItems(estimateId),
    listLaborConditions(estimateId),
    listScopeCategories(true),
    listLaborRates(true),
  ]);

  return { estimate, items, conditions, scopeCategories, laborRates };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function listJobs(): Promise<
  (Job & { project: Pick<Project, 'id' | 'name' | 'project_number' | 'customer_company'> | null })[]
> {
  const { data, error } = await estimatingDb()
    .from('jobs')
    .select('*, project:projects(id,name,project_number,customer_company)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (Job & {
    project: Pick<Project, 'id' | 'name' | 'project_number' | 'customer_company'> | null;
  })[];
}

export async function getJob(id: string): Promise<
  | (Job & {
      project: Project | null;
      budgets: JobBudget[];
    })
  | null
> {
  const { data, error } = await estimatingDb()
    .from('jobs')
    .select('*, project:projects(*), budgets:job_budgets(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const job = data as unknown as Job & { project: Project | null; budgets: JobBudget[] };
  job.budgets = [...(job.budgets ?? [])].sort((a, b) => b.version - a.version);
  return job;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type DashboardSummary = {
  activeProjects: number;
  openEstimates: number;
  awardedEstimates: number;
  bidsDueSoon: (Estimate & { project: Pick<Project, 'id' | 'name' | 'project_number'> | null })[];
  recentEstimates: EstimateWithProject[];
  pipelineValue: number;
  awardedValue: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = estimatingDb();
  const soon = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [projectCount, estimateRows, bidsDue, recent] = await Promise.all([
    db
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'bidding', 'submitted', 'revision_requested']),
    db.from('estimates').select('status, sell_price'),
    db
      .from('estimates')
      .select('*, project:projects(id,name,project_number)')
      .not('bid_date', 'is', null)
      .gte('bid_date', today)
      .lte('bid_date', soon)
      .not('status', 'in', '("superseded","lost")')
      .order('bid_date')
      .limit(10),
    db
      .from('estimates')
      .select('*, project:projects(*)')
      .order('updated_at', { ascending: false })
      .limit(8),
  ]);

  if (projectCount.error) throw projectCount.error;
  if (estimateRows.error) throw estimateRows.error;
  if (bidsDue.error) throw bidsDue.error;
  if (recent.error) throw recent.error;

  const rows = (estimateRows.data ?? []) as { status: string; sell_price: number | string }[];
  const openStatuses = new Set(['draft', 'ready_for_review', 'approved_internal', 'submitted']);

  let pipelineValue = 0;
  let awardedValue = 0;
  let openEstimates = 0;
  let awardedEstimates = 0;

  for (const row of rows) {
    const value = Number(row.sell_price) || 0;
    if (openStatuses.has(row.status)) {
      openEstimates += 1;
      pipelineValue += value;
    }
    if (row.status === 'awarded') {
      awardedEstimates += 1;
      awardedValue += value;
    }
  }

  return {
    activeProjects: projectCount.count ?? 0,
    openEstimates,
    awardedEstimates,
    pipelineValue,
    awardedValue,
    bidsDueSoon: (bidsDue.data ?? []) as unknown as DashboardSummary['bidsDueSoon'],
    recentEstimates: (recent.data ?? []) as unknown as EstimateWithProject[],
  };
}
