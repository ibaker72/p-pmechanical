import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getMaterial,
  listLaborRates,
  listMaterialCategories,
  listMaterials,
  listVendors,
} from '@/lib/estimating/queries';
import { normalizeLaborUnit } from '@/lib/estimating/calc';
import { toRateNumber } from '@/lib/estimating/decimal';
import { formatDate } from '@/lib/estimating/format';
import { CATALOG_PAGE_SIZE } from '@/lib/estimating/constants';
import {
  Badge,
  EmptyState,
  Money,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { MaterialForm } from '@/components/admin/catalog/MaterialForm';
import {
  MaterialCostCell,
  MaterialRowActions,
} from '@/components/admin/catalog/MaterialRowActions';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Materials' };
export const dynamic = 'force-dynamic';

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; status?: string; page?: string; edit?: string };
}) {
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const status =
    searchParams.status === 'inactive' || searchParams.status === 'all'
      ? searchParams.status
      : 'active';

  let result;
  let categories;
  let vendors;
  let laborRates;
  let editing;
  try {
    [result, categories, vendors, laborRates] = await Promise.all([
      listMaterials({
        search: searchParams.q,
        categoryId: searchParams.category || null,
        status,
        page,
      }),
      listMaterialCategories(),
      listVendors(),
      listLaborRates(),
    ]);
    editing = searchParams.edit ? await getMaterial(searchParams.edit) : null;
  } catch (error) {
    return (
      <>
        <PageHeader title="Material price book" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const queryString = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      q: searchParams.q,
      category: searchParams.category,
      status: searchParams.status,
      page: searchParams.page,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `/admin/materials?${query}` : '/admin/materials';
  };

  return (
    <>
      <PageHeader
        title="Material price book"
        subtitle={`${result.total} material${result.total === 1 ? '' : 's'} · page ${result.page} of ${totalPages}`}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="q"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Name, SKU, manufacturer or model"
            className="w-full rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white placeholder:text-steel-500 focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          />
        </div>
        <div>
          <label
            htmlFor="category"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={searchParams.category ?? ''}
            className="rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="status"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-[34px] rounded border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Filter
        </button>
      </form>

      <Panel className="mb-6">
        <PanelHeader
          title={editing ? `Edit ${editing.name}` : 'Add a material'}
          description={
            editing
              ? 'Saving updates the price book only. Estimates keep the price they were built with.'
              : 'Unit cost, waste and productivity are copied onto an estimate when the material is added to it.'
          }
        />
        <PanelBody>
          <MaterialForm
            key={editing?.id ?? 'new'}
            material={editing ?? undefined}
            categories={categories}
            vendors={vendors}
            laborRates={laborRates}
            cancelHref={queryString({ edit: undefined })}
          />
        </PanelBody>
      </Panel>

      <Panel>
        {result.rows.length === 0 ? (
          <EmptyState
            title="No materials found"
            description={
              searchParams.q || searchParams.category
                ? 'Try a different search or clear the filters.'
                : 'Add the materials PP Mechanical buys most often to make takeoffs fast.'
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Material</TH>
                  <TH>SKU</TH>
                  <TH>Category</TH>
                  <TH>Unit</TH>
                  <TH align="right">Unit cost</TH>
                  <TH align="right">Waste</TH>
                  <TH align="right">Hrs/unit</TH>
                  <TH>Vendor</TH>
                  <TH>Cost updated</TH>
                  <TH align="right">Actions</TH>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((material) => (
                  <tr key={material.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{material.name}</span>
                        {!material.is_active && <Badge tone="muted">Inactive</Badge>}
                      </div>
                      {(material.manufacturer || material.model) && (
                        <div className="text-[11px] text-steel-500">
                          {[material.manufacturer, material.model].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </TD>
                    <TD className="font-mono text-xs text-steel-400">{material.sku ?? '—'}</TD>
                    <TD className="text-xs text-steel-300">{material.category?.name ?? '—'}</TD>
                    <TD className="text-xs text-steel-400">{material.unit_of_measure}</TD>
                    <TD align="right">
                      <MaterialCostCell materialId={material.id} unitCost={material.unit_cost} />
                    </TD>
                    <TD align="right" numeric className="text-steel-400">
                      {Number(material.waste_percent).toFixed(1)}%
                    </TD>
                    <TD align="right" numeric className="text-steel-400">
                      {toRateNumber(
                        normalizeLaborUnit(material.default_labor_unit, material.labor_unit_type),
                      ).toFixed(4)}
                    </TD>
                    <TD className="max-w-[140px] truncate text-xs text-steel-300">
                      {material.preferred_vendor?.company_name ?? '—'}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-steel-400">
                      {formatDate(material.last_cost_update_at?.slice(0, 10) ?? null)}
                    </TD>
                    <TD align="right">
                      <MaterialRowActions
                        materialId={material.id}
                        name={material.name}
                        isActive={material.is_active}
                        editHref={queryString({ edit: material.id })}
                      />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        {totalPages > 1 && (
          <PanelBody className="flex items-center justify-between border-t border-white/10">
            <p className="text-xs text-steel-400">
              Showing {(result.page - 1) * result.pageSize + 1}–
              {Math.min(result.page * result.pageSize, result.total)} of {result.total}
            </p>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Link
                  href={queryString({ page: String(result.page - 1) })}
                  className="rounded border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Previous
                </Link>
              )}
              {result.page < totalPages && (
                <Link
                  href={queryString({ page: String(result.page + 1) })}
                  className="rounded border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Next
                </Link>
              )}
            </div>
          </PanelBody>
        )}
      </Panel>

      <p className="mt-4 text-xs text-steel-500">
        Page size is {CATALOG_PAGE_SIZE}. Bulk CSV import is not built yet — the schema and actions
        are structured so it can be added without changing the price-book model.
      </p>
    </>
  );
}
