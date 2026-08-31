import { Fragment } from 'react';
import { toMoneyNumber, toRateNumber } from '@/lib/estimating/decimal';
import { hours as formatHours, money, quantity as formatQuantity } from '@/lib/estimating/format';
import { groupTakeoffItems, groupTotals } from '@/lib/estimating/page-data';
import type { LineTotals } from '@/lib/estimating/calc';
import type { LaborRate, ScopeCategory, TakeoffItem } from '@/lib/estimating/types';
import { Badge, EmptyState, Table, TableWrap, TD, TH } from '../ui';
import { TakeoffRowActions } from './TakeoffRowActions';
import { TakeoffEditRow } from './TakeoffEditRow';

const COLUMNS = 11;

function DispositionBadge({ disposition }: { disposition: TakeoffItem['disposition'] }) {
  if (disposition === 'included') return null;
  const tone =
    disposition === 'excluded' ? 'muted' : disposition === 'alternate' ? 'info' : 'warning';
  return (
    <Badge tone={tone} className="ml-1.5">
      {disposition}
    </Badge>
  );
}

function LineCells({
  item,
  totals,
  indent,
}: {
  item: TakeoffItem;
  totals: LineTotals | undefined;
  indent?: boolean;
}) {
  const overridden = item.is_cost_overridden && item.original_unit_material_cost != null;
  return (
    <>
      <TD className="whitespace-nowrap text-xs text-steel-400">{item.scope_name ?? '—'}</TD>
      <TD className={indent ? 'pl-8' : undefined}>
        <div className="flex flex-wrap items-center">
          <span className={indent ? 'text-steel-300' : 'font-medium text-white'}>
            {item.description}
          </span>
          <DispositionBadge disposition={item.disposition} />
        </div>
        {overridden && (
          <div className="text-[11px] text-ember-300">
            Overridden from {money(item.original_unit_material_cost)}
            {item.override_reason ? ` — ${item.override_reason}` : ''}
          </div>
        )}
        {item.internal_notes && (
          <div className="text-[11px] text-steel-500">{item.internal_notes}</div>
        )}
      </TD>
      <TD align="right" numeric>
        {formatQuantity(item.quantity)}
      </TD>
      <TD className="text-xs text-steel-400">{item.unit}</TD>
      <TD align="right" numeric>
        {totals && totals.materialCost !== 0n ? money(toMoneyNumber(totals.materialCost)) : '—'}
      </TD>
      <TD align="right" numeric className="text-steel-300">
        {totals && totals.laborHours !== 0n ? formatHours(toRateNumber(totals.laborHours), 2) : '—'}
      </TD>
      <TD align="right" numeric>
        {totals && totals.laborCost !== 0n ? money(toMoneyNumber(totals.laborCost)) : '—'}
      </TD>
      <TD align="right" numeric>
        {totals && totals.equipmentCost !== 0n ? money(toMoneyNumber(totals.equipmentCost)) : '—'}
      </TD>
      <TD align="right" numeric>
        {totals && totals.subcontractCost !== 0n
          ? money(toMoneyNumber(totals.subcontractCost))
          : '—'}
      </TD>
      <TD align="right" numeric className="font-semibold text-white">
        {totals ? money(toMoneyNumber(totals.totalCost)) : '—'}
      </TD>
    </>
  );
}

/**
 * The takeoff grid.
 *
 * Assembly group rows render their rolled-up total and their components
 * indented beneath. A group row carries no cost of its own — the numbers on it
 * are the sum of its children, so nothing is counted twice.
 */
export function TakeoffTable({
  items,
  lineTotals,
  scopeCategories,
  laborRates,
  basePath,
  editingId,
  locked,
  emptyMessage,
}: {
  items: TakeoffItem[];
  lineTotals: Map<string, LineTotals>;
  scopeCategories: ScopeCategory[];
  laborRates: LaborRate[];
  basePath: string;
  editingId?: string;
  locked: boolean;
  emptyMessage?: React.ReactNode;
}) {
  const groups = groupTakeoffItems(items);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="No lines yet"
        description={emptyMessage ?? 'Add a line below to start the takeoff.'}
      />
    );
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <TH>Scope</TH>
            <TH>Item</TH>
            <TH align="right">Qty</TH>
            <TH>Unit</TH>
            <TH align="right">Material</TH>
            <TH align="right">Labor hrs</TH>
            <TH align="right">Labor</TH>
            <TH align="right">Equipment</TH>
            <TH align="right">Sub</TH>
            <TH align="right">Total</TH>
            <TH align="right">{locked ? '' : 'Actions'}</TH>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const isAssembly = group.children.length > 0;
            const rolled = groupTotals(group, lineTotals);
            const rowTotals = lineTotals.get(group.row.id);
            const editing = editingId === group.row.id;

            if (editing && !locked) {
              return (
                <TakeoffEditRow
                  key={group.row.id}
                  item={group.row}
                  scopeCategories={scopeCategories}
                  laborRates={laborRates}
                  columns={COLUMNS}
                  cancelHref={basePath}
                />
              );
            }

            return (
              <Fragment key={group.row.id}>
                <tr className="hover:bg-white/[0.02]">
                  {isAssembly ? (
                    <>
                      <TD className="whitespace-nowrap text-xs text-steel-400">
                        {group.row.scope_name ?? '—'}
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-white">{group.row.description}</span>
                          <Badge tone="info">Assembly</Badge>
                          {group.row.source_assembly_version != null && (
                            <span className="text-[11px] text-steel-500">
                              v{group.row.source_assembly_version}
                            </span>
                          )}
                          <DispositionBadge disposition={group.row.disposition} />
                        </div>
                        <div className="text-[11px] text-steel-500">
                          {group.children.length} component
                          {group.children.length === 1 ? '' : 's'}, priced at the values snapshotted
                          when it was added
                        </div>
                      </TD>
                      <TD align="right" numeric>
                        {formatQuantity(group.row.quantity)}
                      </TD>
                      <TD className="text-xs text-steel-400">{group.row.unit}</TD>
                      <TD align="right" numeric>
                        {money(toMoneyNumber(rolled.material))}
                      </TD>
                      <TD align="right" numeric className="text-steel-300">
                        {formatHours(toRateNumber(rolled.laborHours), 2)}
                      </TD>
                      <TD align="right" numeric>
                        {money(toMoneyNumber(rolled.labor))}
                      </TD>
                      <TD align="right" numeric>
                        {money(toMoneyNumber(rolled.equipment))}
                      </TD>
                      <TD align="right" numeric>
                        {money(toMoneyNumber(rolled.subcontract))}
                      </TD>
                      <TD align="right" numeric className="font-semibold text-white">
                        {money(toMoneyNumber(rolled.total))}
                      </TD>
                    </>
                  ) : (
                    <LineCells item={group.row} totals={rowTotals} />
                  )}
                  <TD align="right">
                    {!locked && (
                      <TakeoffRowActions
                        itemId={group.row.id}
                        description={group.row.description}
                        editHref={`${basePath}?edit=${group.row.id}`}
                        canSync={!!group.row.source_material_id}
                      />
                    )}
                  </TD>
                </tr>
                {group.children.map((child) => (
                  <tr key={child.id} className="bg-white/[0.015]">
                    <LineCells item={child} totals={lineTotals.get(child.id)} indent />
                    <TD />
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}
