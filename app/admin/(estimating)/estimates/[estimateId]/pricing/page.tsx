import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import {
  markupToMargin,
  marginToMarkup,
  sellPriceFromMargin,
  sellPriceFromMarkup,
} from '@/lib/estimating/calc';
import { dec, toMoneyNumber, toRateNumber } from '@/lib/estimating/decimal';
import { money } from '@/lib/estimating/format';
import { PRICING_MODE_LABELS } from '@/lib/estimating/constants';
import {
  Callout,
  DetailRow,
  Panel,
  PanelBody,
  PanelHeader,
  StatTile,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { PricingForm } from '@/components/admin/PricingForm';

export const metadata: Metadata = { title: 'Pricing' };
export const dynamic = 'force-dynamic';

/** Margin points to preview alongside the current setting. */
const PREVIEW_MARGINS = [10, 15, 20, 25, 30];

export default async function EstimatePricingPage({ params }: { params: { estimateId: string } }) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, totals, locked } = workspace;
  const costBasis = totals.costBasis;

  const currentMargin = toRateNumber(totals.grossMarginPercent);
  const currentMarkup = toRateNumber(totals.effectiveMarkupPercent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Direct cost" value={money(toMoneyNumber(totals.directCost))} />
        <StatTile
          label="Total cost"
          value={money(toMoneyNumber(costBasis))}
          hint="Direct + overhead + contingency"
        />
        <StatTile label="Bid price" value={money(toMoneyNumber(totals.sellPrice))} emphasis />
        <StatTile
          label="Profit"
          value={money(toMoneyNumber(totals.profitAmount))}
          tone={totals.profitAmount < 0n ? 'danger' : 'positive'}
          emphasis
        />
      </div>

      <Callout tone="info" title="Markup and margin are not the same number">
        This estimate carries <strong>{currentMargin.toFixed(2)}% gross margin</strong>, which is a{' '}
        <strong>{currentMarkup.toFixed(2)}% markup</strong> on cost. Margin is profit ÷ sell price;
        markup is profit ÷ cost. A 20% target margin on {money(toMoneyNumber(costBasis))} of cost
        sells for {money(toMoneyNumber(sellPriceFromMargin(costBasis, dec(20))))}, not{' '}
        {money(toMoneyNumber(sellPriceFromMarkup(costBasis, dec(20))))}.
      </Callout>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Pricing"
              description={`Currently priced on ${PRICING_MODE_LABELS[estimate.pricing_mode].toLowerCase()}.`}
            />
            <PanelBody>
              {locked ? (
                <p className="text-sm text-steel-400">This revision is superseded and read-only.</p>
              ) : (
                <PricingForm estimate={estimate} />
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Cost build-up" />
            <PanelBody>
              <dl>
                <DetailRow label="Material">{money(toMoneyNumber(totals.materialCost))}</DetailRow>
                <DetailRow label="Labor">{money(toMoneyNumber(totals.laborCost))}</DetailRow>
                <DetailRow label="Equipment">
                  {money(toMoneyNumber(totals.equipmentCost))}
                </DetailRow>
                <DetailRow label="Subcontractors">
                  {money(toMoneyNumber(totals.subcontractorCost))}
                </DetailRow>
                <DetailRow label="Other direct">{money(toMoneyNumber(totals.otherCost))}</DetailRow>
                <DetailRow label="Sales tax">
                  {money(toMoneyNumber(totals.salesTaxAmount))}
                </DetailRow>
                <DetailRow label="Direct cost">
                  <strong>{money(toMoneyNumber(totals.directCost))}</strong>
                </DetailRow>
                <DetailRow label={`Overhead (${Number(estimate.overhead_percent).toFixed(2)}%)`}>
                  {money(toMoneyNumber(totals.overheadAmount))}
                </DetailRow>
                <DetailRow
                  label={`Contingency (${Number(estimate.contingency_percent).toFixed(2)}%)`}
                >
                  {money(toMoneyNumber(totals.contingencyAmount))}
                </DetailRow>
                <DetailRow label="Total cost">
                  <strong>{money(toMoneyNumber(costBasis))}</strong>
                </DetailRow>
                <DetailRow label="Profit">{money(toMoneyNumber(totals.profitAmount))}</DetailRow>
                <DetailRow label="Bid price">
                  <strong className="text-ember-300">
                    {money(toMoneyNumber(totals.sellPrice))}
                  </strong>
                </DetailRow>
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Margin preview"
              description="What the bid price would be at other target margins."
            />
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <TH align="right">Margin</TH>
                    <TH align="right">Markup</TH>
                    <TH align="right">Bid price</TH>
                    <TH align="right">Profit</TH>
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_MARGINS.map((marginPercent) => {
                    const margin = dec(marginPercent);
                    const sell = sellPriceFromMargin(costBasis, margin);
                    return (
                      <tr key={marginPercent}>
                        <TD align="right" numeric>
                          {marginPercent}%
                        </TD>
                        <TD align="right" numeric className="text-steel-400">
                          {toRateNumber(marginToMarkup(margin)).toFixed(2)}%
                        </TD>
                        <TD align="right" numeric>
                          {money(toMoneyNumber(sell))}
                        </TD>
                        <TD align="right" numeric>
                          {money(toMoneyNumber(sell - costBasis))}
                        </TD>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
            <PanelBody className="border-t border-white/10">
              <p className="text-[11px] text-steel-500">
                A {Number(estimate.markup_percent).toFixed(2)}% markup would yield a{' '}
                {toRateNumber(markupToMargin(dec(estimate.markup_percent))).toFixed(2)}% gross
                margin.
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
