import { hours as formatHours, factor as formatFactor } from '@/lib/estimating/format';
import { explainLaborFactor } from '@/lib/estimating/calc';
import { toRateNumber } from '@/lib/estimating/decimal';
import type { EstimateLaborCondition } from '@/lib/estimating/types';
import type { EstimateTotals } from '@/lib/estimating/calc';
import { Panel, PanelBody, PanelHeader } from './ui';

/**
 * Shows the labor productivity math step by step.
 *
 * The estimator has to be able to audit how 1,400 base hours became 1,771 —
 * hiding it behind a single adjusted number is how bad assumptions survive.
 */
export function LaborMathPanel({
  conditions,
  totals,
}: {
  conditions: EstimateLaborCondition[];
  totals: EstimateTotals;
}) {
  const explanation = explainLaborFactor(totals.baseLaborHours, conditions);

  return (
    <Panel>
      <PanelHeader
        title="Labor productivity"
        description="Applied to every line that opts into estimate conditions."
      />
      <PanelBody>
        <dl className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-1.5">
            <dt className="text-steel-300">Base labor hours</dt>
            <dd className="tabular-nums text-white">
              {formatHours(toRateNumber(totals.baseLaborHours))}
            </dd>
          </div>
          {explanation.steps.length === 0 ? (
            <p className="pt-2 text-xs text-steel-500">
              No productivity conditions applied. Base hours are used as-is.
            </p>
          ) : (
            explanation.steps.map((step) => (
              <div
                key={step.label}
                className="flex items-baseline justify-between gap-4 border-b border-white/5 py-1.5"
              >
                <dt className="text-steel-300">
                  {step.label}
                  <span className="ml-2 text-xs text-ember-300">
                    x{formatFactor(toRateNumber(step.factor))}
                  </span>
                </dt>
                <dd className="tabular-nums text-steel-200">
                  {formatHours(toRateNumber(step.runningHours))}
                </dd>
              </div>
            ))
          )}
          <div className="flex items-baseline justify-between gap-4 pt-2">
            <dt className="font-semibold text-white">Adjusted labor hours</dt>
            <dd className="font-display text-lg tabular-nums text-white">
              {formatHours(toRateNumber(totals.totalLaborHours))}
            </dd>
          </div>
        </dl>
        {conditions.length > 0 && (
          <p className="mt-3 text-[11px] text-steel-500">
            Combined factor x{formatFactor(toRateNumber(totals.conditionsFactor))}. Lines can opt
            out individually, and each line may carry its own extra factor, so the estimate total
            may differ slightly from base hours x combined factor.
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}
