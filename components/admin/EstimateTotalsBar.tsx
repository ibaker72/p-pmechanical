import { money, moneyWhole, hours } from '@/lib/estimating/format';
import { toMoneyNumber, toRateNumber } from '@/lib/estimating/decimal';
import type { EstimateTotals } from '@/lib/estimating/calc';
import { cn } from '@/lib/utils';

/**
 * Always-visible cost summary. Sticks to the top of the workspace so the
 * estimator can see what a change did without scrolling back up.
 */
export function EstimateTotalsBar({ totals }: { totals: EstimateTotals }) {
  const cells: { label: string; value: string; emphasis?: boolean; tone?: string }[] = [
    { label: 'Material', value: moneyWhole(toMoneyNumber(totals.materialCost)) },
    { label: 'Labor', value: moneyWhole(toMoneyNumber(totals.laborCost)) },
    { label: 'Equip.', value: moneyWhole(toMoneyNumber(totals.equipmentCost)) },
    { label: 'Sub', value: moneyWhole(toMoneyNumber(totals.subcontractorCost)) },
    { label: 'Other', value: moneyWhole(toMoneyNumber(totals.otherCost)) },
    { label: 'Direct cost', value: moneyWhole(toMoneyNumber(totals.directCost)) },
    { label: 'Hours', value: hours(toRateNumber(totals.totalLaborHours), 0) },
    { label: 'Bid price', value: money(toMoneyNumber(totals.sellPrice)), emphasis: true },
    {
      label: 'Margin',
      value: `${toRateNumber(totals.grossMarginPercent).toFixed(1)}%`,
      emphasis: true,
      tone: totals.profitAmount < 0n ? 'text-red-300' : undefined,
    },
  ];

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/10 bg-ink-950/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {cells.map((cell) => (
          <div key={cell.label} className="flex items-baseline gap-1.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-steel-500">
              {cell.label}
            </dt>
            <dd
              className={cn(
                'font-display tabular-nums',
                cell.emphasis ? 'text-base text-white' : 'text-sm text-steel-200',
                cell.tone,
              )}
            >
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
