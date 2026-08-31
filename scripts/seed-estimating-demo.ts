#!/usr/bin/env tsx
// Development seed data for the estimating system.
//
//   npm run seed:estimating -- --confirm
//
// WHAT THIS IS: a small, obviously fictional cost library so a developer can
// exercise the takeoff, assembly explosion and pricing screens without typing
// a price book first.
//
// WHAT THIS IS NOT: real commercial pricing. Every unit cost and productivity
// value below is invented for testing. Do not bid from it. Every record is
// prefixed "[DEMO]" so it is obvious in the UI and easy to remove.
//
// Guards:
//   * refuses to run without --confirm
//   * refuses to run when NODE_ENV or VERCEL_ENV is production
//   * every insert is idempotent on its natural key, so re-running is safe
//
// Remove everything it created with:
//   npm run seed:estimating -- --confirm --remove

import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const confirmed = args.has('--confirm');
const removing = args.has('--remove');

const isProduction =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

if (isProduction) {
  console.error('[seed-estimating] Refusing to run against a production environment.');
  process.exit(1);
}
if (!confirmed) {
  console.error(
    '[seed-estimating] This writes clearly-fictional demo data. Re-run with --confirm if that is what you want.',
  );
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE;

if (!url || !key) {
  console.error('[seed-estimating] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const PREFIX = '[DEMO]';

function fail(context: string, error: { message?: string } | null): void {
  if (error) {
    console.error(`[seed-estimating] ${context}: ${error.message}`);
    process.exit(1);
  }
}

async function remove(): Promise<void> {
  console.log('[seed-estimating] Removing demo records…');
  // Order matters: assembly items cascade with assemblies, but materials and
  // rates are referenced by them, so assemblies go first.
  await db.from('assemblies').delete().like('name', `${PREFIX}%`);
  await db.from('materials').delete().like('name', `${PREFIX}%`);
  await db.from('equipment_rates').delete().like('name', `${PREFIX}%`);
  await db.from('labor_rates').delete().like('name', `${PREFIX}%`);
  await db.from('vendors').delete().like('company_name', `${PREFIX}%`);
  await db.from('material_categories').delete().like('name', `${PREFIX}%`);
  console.log('[seed-estimating] Done. Projects and estimates were not touched.');
}

async function upsertReturningId(
  table: string,
  match: Record<string, string>,
  row: Record<string, unknown>,
): Promise<string> {
  let query = db.from(table).select('id');
  for (const [column, value] of Object.entries(match)) query = query.eq(column, value);
  const { data: existing, error: readError } = await query.maybeSingle();
  fail(`reading ${table}`, readError);
  if (existing) {
    const { error } = await db
      .from(table)
      .update(row)
      .eq('id', (existing as { id: string }).id);
    fail(`updating ${table}`, error);
    return (existing as { id: string }).id;
  }
  const { data, error } = await db.from(table).insert(row).select('id').single();
  fail(`inserting into ${table}`, error);
  return (data as { id: string }).id;
}

async function seed(): Promise<void> {
  console.log('[seed-estimating] Seeding fictional demo data…\n');

  // --- Vendors -------------------------------------------------------------
  const supplierId = await upsertReturningId(
    'vendors',
    { company_name: `${PREFIX} North Jersey Mechanical Supply` },
    {
      company_name: `${PREFIX} North Jersey Mechanical Supply`,
      category: 'mechanical_equipment_supplier',
      is_supplier: true,
      is_subcontractor: false,
      notes: 'Fictional test vendor.',
    },
  );
  const controlsSubId = await upsertReturningId(
    'vendors',
    { company_name: `${PREFIX} Sample Controls Co.` },
    {
      company_name: `${PREFIX} Sample Controls Co.`,
      category: 'controls',
      is_supplier: false,
      is_subcontractor: true,
      notes: 'Fictional test subcontractor.',
    },
  );
  await upsertReturningId(
    'vendors',
    { company_name: `${PREFIX} Sample Electrical Contractors` },
    {
      company_name: `${PREFIX} Sample Electrical Contractors`,
      category: 'electrical',
      is_supplier: false,
      is_subcontractor: true,
      notes: 'Fictional test subcontractor.',
    },
  );
  console.log('  vendors           ✓');

  // --- Labor classifications ----------------------------------------------
  // Burdened rates. Invented figures for testing only.
  const laborRates: {
    code: string;
    name: string;
    rate: number;
    pw: number | null;
    order: number;
  }[] = [
    {
      code: 'demo_sm_journeyman',
      name: `${PREFIX} Sheet Metal Journeyman`,
      rate: 82.5,
      pw: 118.0,
      order: 10,
    },
    {
      code: 'demo_sm_apprentice',
      name: `${PREFIX} Sheet Metal Apprentice`,
      rate: 54.0,
      pw: 76.0,
      order: 20,
    },
    { code: 'demo_pipefitter', name: `${PREFIX} Pipefitter`, rate: 89.0, pw: 126.0, order: 30 },
    { code: 'demo_foreman', name: `${PREFIX} Foreman`, rate: 98.0, pw: 134.0, order: 40 },
    {
      code: 'demo_startup_tech',
      name: `${PREFIX} Startup Technician`,
      rate: 95.0,
      pw: null,
      order: 50,
    },
  ];
  const rateIds: Record<string, string> = {};
  for (const rate of laborRates) {
    rateIds[rate.code] = await upsertReturningId(
      'labor_rates',
      { code: rate.code },
      {
        code: rate.code,
        name: rate.name,
        base_hourly_rate: rate.rate,
        prevailing_wage_hourly_rate: rate.pw,
        sort_order: rate.order,
        notes: 'Fictional burdened rate for local testing only.',
      },
    );
  }
  console.log('  labor rates       ✓');

  // --- Material categories -------------------------------------------------
  const categories: Record<string, string> = {};
  for (const [code, name] of [
    ['demo_ductwork', `${PREFIX} Ductwork`],
    ['demo_piping', `${PREFIX} Piping`],
    ['demo_equipment', `${PREFIX} Equipment`],
    ['demo_accessories', `${PREFIX} Accessories`],
  ] as const) {
    categories[code] = await upsertReturningId('material_categories', { code }, { code, name });
  }
  console.log('  categories        ✓');

  // --- Materials -----------------------------------------------------------
  type MaterialSeed = {
    sku: string;
    name: string;
    category: string;
    unit: string;
    cost: number;
    waste: number;
    laborUnit: number;
    rateCode: string;
  };
  const materials: MaterialSeed[] = [
    {
      sku: 'DEMO-SPIRAL-10',
      name: `${PREFIX} 10" spiral duct`,
      category: 'demo_ductwork',
      unit: 'LF',
      cost: 9.25,
      waste: 8,
      laborUnit: 0.12,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-RECT-24X12',
      name: `${PREFIX} 24x12 rectangular duct`,
      category: 'demo_ductwork',
      unit: 'LF',
      cost: 27.5,
      waste: 10,
      laborUnit: 0.35,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-CU-L-2',
      name: `${PREFIX} 2" Type L copper pipe`,
      category: 'demo_piping',
      unit: 'LF',
      cost: 31.4,
      waste: 5,
      laborUnit: 0.28,
      rateCode: 'demo_pipefitter',
    },
    {
      sku: 'DEMO-CU-ELL-2',
      name: `${PREFIX} 2" copper elbow`,
      category: 'demo_piping',
      unit: 'EA',
      cost: 18.9,
      waste: 3,
      laborUnit: 0.4,
      rateCode: 'demo_pipefitter',
    },
    {
      sku: 'DEMO-HANGER-2',
      name: `${PREFIX} 2" pipe hanger`,
      category: 'demo_accessories',
      unit: 'EA',
      cost: 7.15,
      waste: 2,
      laborUnit: 0.2,
      rateCode: 'demo_pipefitter',
    },
    {
      sku: 'DEMO-ROD-38',
      name: `${PREFIX} 3/8" threaded rod`,
      category: 'demo_accessories',
      unit: 'LF',
      cost: 2.4,
      waste: 10,
      laborUnit: 0.05,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-STRUT',
      name: `${PREFIX} Strut channel`,
      category: 'demo_accessories',
      unit: 'LF',
      cost: 6.8,
      waste: 10,
      laborUnit: 0.08,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-RTU-5T',
      name: `${PREFIX} 5-ton rooftop unit`,
      category: 'demo_equipment',
      unit: 'EA',
      cost: 6450,
      waste: 0,
      laborUnit: 10,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-CURB-5T',
      name: `${PREFIX} Roof curb, 5-ton`,
      category: 'demo_equipment',
      unit: 'EA',
      cost: 915,
      waste: 0,
      laborUnit: 3,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-VAV-8',
      name: `${PREFIX} VAV box, 8"`,
      category: 'demo_equipment',
      unit: 'EA',
      cost: 780,
      waste: 0,
      laborUnit: 3.5,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-DIFFUSER',
      name: `${PREFIX} Ceiling diffuser 24x24`,
      category: 'demo_accessories',
      unit: 'EA',
      cost: 62,
      waste: 2,
      laborUnit: 0.75,
      rateCode: 'demo_sm_journeyman',
    },
    {
      sku: 'DEMO-INSUL-2',
      name: `${PREFIX} 2" pipe insulation`,
      category: 'demo_piping',
      unit: 'LF',
      cost: 8.1,
      waste: 12,
      laborUnit: 0.1,
      rateCode: 'demo_pipefitter',
    },
  ];

  const materialIds: Record<string, string> = {};
  for (const material of materials) {
    materialIds[material.sku] = await upsertReturningId(
      'materials',
      { sku: material.sku },
      {
        sku: material.sku,
        name: material.name,
        category_id: categories[material.category],
        unit_of_measure: material.unit,
        unit_cost: material.cost,
        waste_percent: material.waste,
        default_labor_unit: material.laborUnit,
        labor_unit_type: 'hours_per_unit',
        default_labor_rate_id: rateIds[material.rateCode],
        preferred_vendor_id: supplierId,
        last_cost_update_at: new Date().toISOString(),
        notes: 'Fictional pricing for local testing only. Not a real quote.',
      },
    );
  }
  console.log('  materials         ✓');

  // --- Equipment / rental --------------------------------------------------
  for (const equipment of [
    {
      code: 'demo_scissor_26',
      name: `${PREFIX} Scissor lift 26'`,
      daily: 145,
      weekly: 420,
      monthly: 1100,
      mob: 175,
      delivery: 150,
      pickup: 150,
    },
    {
      code: 'demo_boom_45',
      name: `${PREFIX} Boom lift 45'`,
      daily: 310,
      weekly: 940,
      monthly: 2400,
      mob: 350,
      delivery: 275,
      pickup: 275,
    },
    {
      code: 'demo_crane_day',
      name: `${PREFIX} Crane, day rate`,
      daily: 2600,
      weekly: 0,
      monthly: 0,
      mob: 1200,
      delivery: 0,
      pickup: 0,
    },
    {
      code: 'demo_dumpster',
      name: `${PREFIX} Dumpster, 30 yd`,
      daily: 0,
      weekly: 675,
      monthly: 0,
      mob: 0,
      delivery: 185,
      pickup: 185,
    },
  ]) {
    await upsertReturningId(
      'equipment_rates',
      { code: equipment.code },
      {
        code: equipment.code,
        name: equipment.name,
        category: 'rental',
        unit: 'DAY',
        daily_rate: equipment.daily,
        weekly_rate: equipment.weekly,
        monthly_rate: equipment.monthly,
        mobilization_cost: equipment.mob,
        delivery_cost: equipment.delivery,
        pickup_cost: equipment.pickup,
        notes: 'Fictional rental pricing for local testing only.',
      },
    );
  }
  console.log('  equipment rates   ✓');

  // --- Scope category lookup for assemblies --------------------------------
  const { data: scopes } = await db.from('scope_categories').select('id, code');
  const scopeIds = new Map(
    ((scopes ?? []) as { id: string; code: string }[]).map((scope) => [scope.code, scope.id]),
  );

  // --- Assemblies ----------------------------------------------------------
  type ComponentSeed = {
    type: 'material' | 'labor' | 'equipment' | 'subcontract' | 'other';
    description: string;
    qty: number;
    unit: string;
    cost?: number;
    waste?: number;
    hours?: number;
    rateCode?: string;
    sku?: string;
    vendorId?: string;
  };

  async function seedAssembly(
    code: string,
    name: string,
    unit: string,
    scopeCode: string,
    description: string,
    components: ComponentSeed[],
  ) {
    const assemblyId = await upsertReturningId(
      'assemblies',
      { code },
      {
        code,
        name,
        unit,
        description,
        scope_category_id: scopeIds.get(scopeCode) ?? null,
        notes: 'Fictional assembly for local testing only. Verify every value before bidding.',
      },
    );

    // Components are replaced wholesale so re-running is deterministic.
    await db.from('assembly_items').delete().eq('assembly_id', assemblyId);
    const rows = components.map((component, index) => ({
      assembly_id: assemblyId,
      sort_order: index,
      item_type: component.type,
      material_id: component.sku ? materialIds[component.sku] : null,
      labor_rate_id: component.rateCode ? rateIds[component.rateCode] : null,
      vendor_id: component.vendorId ?? null,
      description: component.description,
      quantity_per_unit: component.qty,
      unit: component.unit,
      unit_cost: component.cost ?? 0,
      waste_percent: component.waste ?? 0,
      labor_hours_per_unit: component.hours ?? 0,
    }));
    const { error } = await db.from('assembly_items').insert(rows);
    fail(`inserting components for ${name}`, error);
  }

  await seedAssembly(
    'demo_rtu_5t_std',
    `${PREFIX} 5 Ton RTU – Standard Installation`,
    'EA',
    'hvac_equipment',
    'Furnish and install one packaged rooftop unit including curb, controls interface, gas and condensate connections, and startup.',
    [
      {
        type: 'material',
        sku: 'DEMO-RTU-5T',
        description: '5-ton rooftop unit',
        qty: 1,
        unit: 'EA',
        cost: 6450,
        hours: 10,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        sku: 'DEMO-CURB-5T',
        description: 'Roof curb',
        qty: 1,
        unit: 'EA',
        cost: 915,
        hours: 3,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        description: 'Duct transitions and flex connections',
        qty: 1,
        unit: 'LOT',
        cost: 340,
        waste: 10,
        hours: 4,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        description: 'Gas piping allowance',
        qty: 1,
        unit: 'LOT',
        cost: 425,
        hours: 5,
        rateCode: 'demo_pipefitter',
      },
      {
        type: 'material',
        description: 'Condensate piping',
        qty: 1,
        unit: 'LOT',
        cost: 145,
        hours: 2,
        rateCode: 'demo_pipefitter',
      },
      {
        type: 'material',
        description: 'Miscellaneous fittings and consumables',
        qty: 1,
        unit: 'LOT',
        cost: 180,
        waste: 5,
      },
      {
        type: 'labor',
        description: 'Startup and commissioning',
        qty: 1,
        unit: 'EA',
        hours: 4,
        rateCode: 'demo_startup_tech',
      },
      { type: 'equipment', description: 'Crane allowance', qty: 1, unit: 'EA', cost: 1350 },
      {
        type: 'subcontract',
        description: 'Electrical hookup allowance',
        qty: 1,
        unit: 'LOT',
        cost: 1250,
      },
      {
        type: 'subcontract',
        description: 'Controls integration allowance',
        qty: 1,
        unit: 'LOT',
        cost: 900,
        vendorId: controlsSubId,
      },
    ],
  );

  await seedAssembly(
    'demo_vav_std',
    `${PREFIX} VAV Box – Standard Installation`,
    'EA',
    'sheet_metal',
    'Furnish and install one VAV terminal unit with supply transition, flexible connection, hanger support, insulation and diffuser allowance.',
    [
      {
        type: 'material',
        sku: 'DEMO-VAV-8',
        description: 'VAV terminal unit',
        qty: 1,
        unit: 'EA',
        cost: 780,
        hours: 3.5,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        description: 'Supply duct transition',
        qty: 1,
        unit: 'LOT',
        cost: 95,
        waste: 10,
        hours: 1.2,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        description: 'Flexible connection',
        qty: 12,
        unit: 'LF',
        cost: 6.4,
        waste: 10,
        hours: 0.06,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        sku: 'DEMO-ROD-38',
        description: 'Hanger support',
        qty: 8,
        unit: 'LF',
        cost: 2.4,
        waste: 10,
        hours: 0.05,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        sku: 'DEMO-DIFFUSER',
        description: 'Diffuser allowance',
        qty: 1,
        unit: 'EA',
        cost: 62,
        hours: 0.75,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'material',
        description: 'Duct insulation',
        qty: 12,
        unit: 'SF',
        cost: 2.15,
        waste: 12,
        hours: 0.04,
        rateCode: 'demo_sm_journeyman',
      },
      {
        type: 'subcontract',
        description: 'Controls allowance',
        qty: 1,
        unit: 'LOT',
        cost: 340,
        vendorId: controlsSubId,
      },
    ],
  );

  await seedAssembly(
    'demo_hydronic_2in_lf',
    `${PREFIX} 2" Hydronic Pipe – Installed LF`,
    'LF',
    'hydronic_piping',
    'Furnish and install 2" hydronic piping including fittings, hangers, insulation and consumables, per linear foot.',
    [
      {
        type: 'material',
        sku: 'DEMO-CU-L-2',
        description: '2" Type L copper pipe',
        qty: 1,
        unit: 'LF',
        cost: 31.4,
        waste: 5,
        hours: 0.28,
        rateCode: 'demo_pipefitter',
      },
      {
        type: 'material',
        sku: 'DEMO-CU-ELL-2',
        description: 'Fittings allowance (0.15 per LF)',
        qty: 0.15,
        unit: 'EA',
        cost: 18.9,
        waste: 3,
        hours: 0.4,
        rateCode: 'demo_pipefitter',
      },
      {
        type: 'material',
        sku: 'DEMO-HANGER-2',
        description: 'Hanger (one per 8 LF)',
        qty: 0.125,
        unit: 'EA',
        cost: 7.15,
        waste: 2,
        hours: 0.2,
        rateCode: 'demo_pipefitter',
      },
      {
        type: 'material',
        sku: 'DEMO-INSUL-2',
        description: '2" pipe insulation',
        qty: 1,
        unit: 'LF',
        cost: 8.1,
        waste: 12,
        hours: 0.1,
        rateCode: 'demo_pipefitter',
      },
      { type: 'other', description: 'Consumables', qty: 1, unit: 'LF', cost: 0.85 },
    ],
  );
  console.log('  assemblies        ✓');

  console.log(
    `\n[seed-estimating] Done. Every record is prefixed "${PREFIX}" and carries fictional pricing.`,
  );
  console.log('[seed-estimating] Remove it with: npm run seed:estimating -- --confirm --remove');
}

void (removing ? remove() : seed()).catch((error) => {
  console.error(`[seed-estimating] failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
