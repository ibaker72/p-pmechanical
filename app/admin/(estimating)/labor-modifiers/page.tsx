import Link from 'next/link';
import type { Metadata } from 'next';
import { listLaborModifiers } from '@/lib/estimating/queries';
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
import {
  DeleteLaborModifierButton,
  LaborModifierForm,
} from '@/components/admin/catalog/CatalogForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Labor modifiers' };
export const dynamic = 'force-dynamic';

export default async function LaborModifiersPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  let modifiers;
  try {
    modifiers = await listLaborModifiers(true);
  } catch (error) {
    return (
      <>
        <PageHeader title="Labor modifiers" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  const editing = modifiers.find((modifier) => modifier.id === searchParams.edit);
  const unset = modifiers.filter(
    (modifier) => Number(modifier.factor) === 1 && modifier.code !== 'normal_conditions',
  );

  return (
    <>
      <PageHeader
        title="Labor productivity modifiers"
        subtitle="Company-specific factors applied to labor hours. Not industry constants."
      />

      <Callout tone="warning" title="Set these from PP Mechanical's own production history">
        Every modifier ships with a factor of 1.00 — no effect — on purpose. The system does not
        assert what an occupied building or a high ceiling costs in productivity; that number comes
        from your jobs.
        {unset.length > 0 && (
          <>
            {' '}
            {unset.length} modifier{unset.length === 1 ? ' is' : 's are'} still at 1.00.
          </>
        )}
      </Callout>

      <Panel className="my-6">
        <PanelHeader title={editing ? `Edit ${editing.name}` : 'Add a modifier'} />
        <PanelBody>
          <LaborModifierForm
            key={editing?.id ?? 'new'}
            modifier={editing}
            cancelHref="/admin/labor-modifiers"
          />
        </PanelBody>
      </Panel>

      <Panel>
        {modifiers.length === 0 ? (
          <EmptyState title="No labor modifiers yet" />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Modifier</TH>
                  <TH>Code</TH>
                  <TH>Category</TH>
                  <TH align="right">Factor</TH>
                  <TH align="right">Effect on hours</TH>
                  <TH align="right">Actions</TH>
                </tr>
              </thead>
              <tbody>
                {modifiers.map((modifier) => {
                  const factor = Number(modifier.factor);
                  const delta = (factor - 1) * 100;
                  return (
                    <tr key={modifier.id} className="hover:bg-white/[0.02]">
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{modifier.name}</span>
                          {!modifier.is_active && <Badge tone="muted">Inactive</Badge>}
                        </div>
                        {modifier.description && (
                          <div className="text-[11px] text-steel-500">{modifier.description}</div>
                        )}
                      </TD>
                      <TD className="font-mono text-xs text-steel-400">{modifier.code}</TD>
                      <TD className="text-xs text-steel-300">{modifier.category ?? '—'}</TD>
                      <TD align="right" numeric className="font-semibold text-white">
                        x{factor.toFixed(4)}
                      </TD>
                      <TD align="right" numeric>
                        {delta === 0 ? (
                          <span className="text-steel-500">no effect</span>
                        ) : (
                          <span className={delta > 0 ? 'text-ember-300' : 'text-emerald-300'}>
                            {delta > 0 ? '+' : ''}
                            {delta.toFixed(2)}%
                          </span>
                        )}
                      </TD>
                      <TD align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/labor-modifiers?edit=${modifier.id}`}
                            className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
                          >
                            Edit
                          </Link>
                          <DeleteLaborModifierButton id={modifier.id} name={modifier.name} />
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
