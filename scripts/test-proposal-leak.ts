#!/usr/bin/env tsx
// Guards the customer-facing proposal against internal-cost leakage.
//
//   npm run test:proposal
//
// A previous pass shipped a real leak: the proposal renders inside the estimate
// layout, whose sticky totals bar shows direct cost and gross margin. Printing
// the proposal therefore put PP Mechanical's cost and margin on the page handed
// to the general contractor. These assertions exist so that cannot come back.
//
// The checks are structural rather than visual on purpose: hiding a number with
// CSS is not a control, so we assert the number is never referenced at all, and
// separately that the estimator-only chrome is excluded from the printed sheet.

import { readFileSync } from 'node:fs';

const PROPOSAL = 'app/admin/(estimating)/estimates/[estimateId]/proposal/page.tsx';
const LAYOUT = 'app/admin/(estimating)/estimates/[estimateId]/layout.tsx';
const GLOBALS = 'app/globals.css';

/** Fields that must never appear anywhere in the proposal page. */
const FORBIDDEN_FIELDS = [
  // estimate cost columns
  'material_cost',
  'labor_cost',
  'equipment_cost',
  'subcontractor_cost',
  'direct_cost',
  'overhead_amount',
  'overhead_percent',
  'contingency_amount',
  'contingency_percent',
  'profit_amount',
  'markup_percent',
  'effective_markup_percent',
  'gross_margin_percent',
  'other_direct_cost',
  'sales_tax_percent',
  'sales_tax_amount',
  // takeoff cost columns
  'unit_material_cost',
  'material_waste_percent',
  'labor_hours_per_unit',
  'labor_rate_snapshot',
  'labor_rate_name',
  'original_unit_material_cost',
  'is_cost_overridden',
  'override_reason',
  'subcontract_cost',
  // master data
  'base_hourly_rate',
  'prevailing_wage_hourly_rate',
  // internal narrative
  'internal_notes',
  // engine totals (only sellPrice is customer-facing)
  'materialCost',
  'laborCost',
  'equipmentCost',
  'subcontractorCost',
  'directCost',
  'costBasis',
  'profitAmount',
  'grossMarginPercent',
  'effectiveMarkupPercent',
  'overheadAmount',
  'contingencyAmount',
  'totalLaborHours',
  'baseLaborHours',
  'salesTaxAmount',
  'conditionsFactor',
  'alternatesCost',
  'excludedCost',
];

type Test = { name: string; run: () => boolean | string };
const tests: Test[] = [];
const test = (name: string, run: Test['run']) => tests.push({ name, run });

const proposal = readFileSync(PROPOSAL, 'utf8');
const layout = readFileSync(LAYOUT, 'utf8');
const globals = readFileSync(GLOBALS, 'utf8');

/** Strip comments so a field named only in an explanatory note doesn't trip. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
const proposalCode = stripComments(proposal);

for (const field of FORBIDDEN_FIELDS) {
  test(`proposal never references "${field}"`, () => {
    const re = new RegExp(`\\b${field}\\b`);
    return re.test(proposalCode) ? `found "${field}" in ${PROPOSAL}` : true;
  });
}

test('proposal reads exactly one figure off totals (sellPrice)', () => {
  const used = [...proposalCode.matchAll(/totals\.([A-Za-z]+)/g)].map((m) => m[1]);
  const unique = [...new Set(used)];
  if (unique.length === 0) return 'proposal reads no total at all — expected sellPrice';
  return unique.every((u) => u === 'sellPrice')
    ? true
    : `proposal reads totals.${unique.filter((u) => u !== 'sellPrice').join(', totals.')}`;
});

test('proposal renders scope items via customer_text, never internal_notes', () => {
  if (!/item\.customer_text/.test(proposalCode))
    return 'expected item.customer_text to be rendered';
  return /item\.internal_notes/.test(proposalCode) ? 'internal_notes is rendered' : true;
});

test('the only client component on the proposal takes no data props', () => {
  // PrintButton is the sole interactive element; anything it received would be
  // serialized into the RSC payload sent to the browser.
  const clientUsages = [...proposalCode.matchAll(/<PrintButton([^/>]*)\/?>/g)].map((m) =>
    m[1].trim(),
  );
  if (clientUsages.length === 0) return 'PrintButton not found — did the page change?';
  return clientUsages.every((props) => props === '')
    ? true
    : `PrintButton received props: ${clientUsages.join(' | ')}`;
});

test('estimate layout chrome is excluded from the printed proposal', () => {
  if (!/className="print-hidden"/.test(layout)) {
    return 'layout chrome is not wrapped in print-hidden — the totals bar would print on the proposal';
  }
  // The totals bar and tabs must sit inside that wrapper.
  const wrapperStart = layout.indexOf('className="print-hidden"');
  const childrenAt = layout.indexOf('{children}');
  const totalsAt = layout.indexOf('<EstimateTotalsBar');
  const tabsAt = layout.indexOf('<EstimateTabs');
  if (totalsAt < 0 || tabsAt < 0) return 'totals bar or tabs missing from the layout';
  return totalsAt > wrapperStart &&
    totalsAt < childrenAt &&
    tabsAt > wrapperStart &&
    tabsAt < childrenAt
    ? true
    : 'totals bar / tabs are outside the print-hidden wrapper';
});

test('globals.css hides .print-hidden when printing', () => {
  const printBlock = globals.slice(globals.indexOf('@media print'));
  return /\.print-hidden[\s\S]{0,120}display:\s*none\s*!important/.test(printBlock)
    ? true
    : '.print-hidden is not display:none in the print stylesheet';
});

test('totals bar still exposes internal figures (so the guard above matters)', () => {
  const bar = readFileSync('components/admin/EstimateTotalsBar.tsx', 'utf8');
  return /directCost/.test(bar) && /grossMarginPercent/.test(bar)
    ? true
    : 'totals bar no longer shows internal figures — revisit this guard';
});

let passed = 0;
const failures: string[] = [];
for (const t of tests) {
  let r: boolean | string;
  try {
    r = t.run();
  } catch (e) {
    r = `threw ${e instanceof Error ? e.message : String(e)}`;
  }
  if (r === true) passed += 1;
  else failures.push(`  x ${t.name}${typeof r === 'string' ? `\n      ${r}` : ''}`);
}
console.log(`\n[test-proposal-leak] ${passed}/${tests.length} passed`);
if (failures.length) {
  console.error(`\n${failures.join('\n')}\n`);
  process.exit(1);
}
process.exit(0);
