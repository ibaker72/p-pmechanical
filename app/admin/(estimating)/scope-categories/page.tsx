import Link from 'next/link';
import type { Metadata } from 'next';
import { listScopeCategories } from '@/lib/estimating/queries';
import {
  Badge,
  Callout,
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { ScopeCategoryForm } from '@/components/admin/catalog/CatalogForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Scope categories' };
export const dynamic = 'force-dynamic';

export default async function ScopeCategoriesPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  let categories;
  try {
    categories = await listScopeCategories(true);
  } catch (error) {
    return (
      <>
        <PageHeader title="Scope categories" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  const editing = categories.find((category) => category.id === searchParams.edit);

  return (
    <>
      <PageHeader
        title="Scope categories"
        subtitle="The mechanical scope taxonomy used by estimates, assemblies and takeoff lines."
      />

      <Callout tone="info" title="Adding a scope never requires a code change">
        Scope categories are data. Add, rename or deactivate them here and they appear everywhere
        immediately. Takeoff lines snapshot the code and name they were filed under, so renaming a
        category does not rewrite an old bid&rsquo;s wording.
      </Callout>

      <Panel className="my-6">
        <PanelHeader title={editing ? `Edit ${editing.name}` : 'Add a scope category'} />
        <PanelBody>
          <ScopeCategoryForm
            key={editing?.id ?? 'new'}
            category={editing}
            cancelHref="/admin/scope-categories"
          />
        </PanelBody>
      </Panel>

      <Panel>
        {categories.length === 0 ? (
          <EmptyState title="No scope categories" />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH align="right">Order</TH>
                  <TH>Name</TH>
                  <TH>Code</TH>
                  <TH>Description</TH>
                  <TH align="right">Actions</TH>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-white/[0.02]">
                    <TD align="right" numeric className="text-steel-500">
                      {category.sort_order}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{category.name}</span>
                        {!category.is_active && <Badge tone="muted">Inactive</Badge>}
                      </div>
                    </TD>
                    <TD className="font-mono text-xs text-steel-400">{category.code}</TD>
                    <TD className="text-xs text-steel-400">{category.description ?? '—'}</TD>
                    <TD align="right">
                      <Link
                        href={`/admin/scope-categories?edit=${category.id}`}
                        className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
                      >
                        Edit
                      </Link>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
