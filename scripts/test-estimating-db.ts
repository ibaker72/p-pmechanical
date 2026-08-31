#!/usr/bin/env tsx
// Integration tests for the estimating database.
//
// Run with:
//   npm run test:estimating-db
//
// These need a real Supabase project with migrations 003-005 applied:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// Without those the script SKIPS and exits 0, so CI (which has no secrets) is
// not blocked by tests it cannot run. It never claims to have verified
// anything it did not actually run.
//
// Every row it creates is namespaced with a run id and deleted in a finally
// block, so it is safe against a development project. Do not point it at
// production.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.log(
    '[test-estimating-db] SKIPPED — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.',
  );
  process.exit(0);
}

const RUN_ID = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon: SupabaseClient | null = anonKey
  ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
}

/** True when the response looks like "RLS denied this". */
function isDenied(error: { message?: string; code?: string } | null, rows: unknown[] | null) {
  if (error) return true;
  // With RLS on and no policy, PostgREST returns an empty set rather than an error.
  return Array.isArray(rows) && rows.length === 0;
}

const createdProjectIds: string[] = [];
const createdMaterialIds: string[] = [];

async function main() {
  try {
    // -----------------------------------------------------------------------
    // Schema presence
    // -----------------------------------------------------------------------
    const { error: schemaError } = await admin.from('estimates').select('id').limit(1);
    if (schemaError) {
      console.error(
        `[test-estimating-db] FAILED — the estimating tables are not reachable: ${schemaError.message}`,
      );
      console.error('Apply migrations 003-005 from supabase/migrations, then re-run.');
      process.exit(1);
    }

    // -----------------------------------------------------------------------
    // Seed a project + estimate to test against
    // -----------------------------------------------------------------------
    const { data: project, error: projectError } = await admin
      .from('projects')
      .insert({ name: `${RUN_ID} project`, project_number: RUN_ID.toUpperCase(), status: 'draft' })
      .select('id')
      .single();
    if (projectError || !project) {
      console.error(
        `[test-estimating-db] FAILED — could not create a project: ${projectError?.message}`,
      );
      process.exit(1);
    }
    createdProjectIds.push(project.id as string);
    record('service role can create a project', true);

    const { data: rev1, error: rev1Error } = await admin
      .from('estimates')
      .insert({ project_id: project.id, estimate_number: RUN_ID.toUpperCase(), revision: 1 })
      .select('id')
      .single();
    record('service role can create an estimate', !rev1Error && !!rev1, rev1Error?.message);

    // -----------------------------------------------------------------------
    // Unauthenticated (anon) access must see nothing and write nothing
    // -----------------------------------------------------------------------
    if (!anon) {
      record('anon checks', false, 'SUPABASE_ANON_KEY is not set — anon access was NOT verified');
    } else {
      for (const table of [
        'projects',
        'estimates',
        'estimate_takeoff_items',
        'estimate_scope_items',
        'estimate_checklist_items',
        'materials',
        'labor_rates',
        'assemblies',
        'vendors',
        'project_documents',
        'jobs',
        'job_budgets',
      ]) {
        const { data, error } = await anon.from(table).select('id').limit(1);
        record(
          `anon cannot read ${table}`,
          isDenied(error, data),
          error?.message ?? 'rows returned',
        );
      }

      const { error: anonInsert } = await anon
        .from('projects')
        .insert({ name: `${RUN_ID} anon`, project_number: `${RUN_ID}-ANON` });
      record(
        'anon cannot insert a project',
        !!anonInsert,
        anonInsert ? undefined : 'insert succeeded',
      );

      const { error: anonUpdate } = await anon
        .from('estimates')
        .update({ sell_price: 1 })
        .eq('id', rev1?.id ?? '00000000-0000-0000-0000-000000000000');
      // An update that matches nothing is not an error, so also confirm the row
      // is unchanged from the service-role side.
      const { data: unchanged } = await admin
        .from('estimates')
        .select('sell_price')
        .eq('id', rev1?.id)
        .maybeSingle();
      record(
        'anon cannot change an estimate sell price',
        Number((unchanged as { sell_price: number } | null)?.sell_price ?? 0) === 0,
        anonUpdate?.message,
      );

      const { error: anonDelete } = await anon.from('projects').delete().eq('id', project.id);
      const { data: stillThere } = await admin
        .from('projects')
        .select('id')
        .eq('id', project.id)
        .maybeSingle();
      record('anon cannot delete a project', !!stillThere, anonDelete?.message);
    }

    // -----------------------------------------------------------------------
    // Referential integrity
    // -----------------------------------------------------------------------
    const { error: orphanError } = await admin.from('estimates').insert({
      project_id: '00000000-0000-0000-0000-000000000000',
      estimate_number: `${RUN_ID}-ORPHAN`,
      revision: 1,
    });
    record(
      'an estimate cannot reference a project that does not exist',
      !!orphanError,
      orphanError ? undefined : 'the orphan insert succeeded',
    );

    const { error: dupRevision } = await admin
      .from('estimates')
      .insert({ project_id: project.id, estimate_number: RUN_ID.toUpperCase(), revision: 1 });
    record(
      'two revisions cannot share a number on one project',
      !!dupRevision,
      dupRevision ? undefined : 'the duplicate revision was allowed',
    );

    // -----------------------------------------------------------------------
    // Constraints that protect the money
    // -----------------------------------------------------------------------
    const { error: negativeQty } = await admin.from('estimate_takeoff_items').insert({
      estimate_id: rev1?.id,
      description: 'negative quantity',
      quantity: -5,
    });
    record(
      'a negative quantity is rejected by the database',
      !!negativeQty,
      negativeQty ? undefined : 'accepted',
    );

    const { error: badMargin } = await admin
      .from('estimates')
      .update({ target_margin_percent: 100 })
      .eq('id', rev1?.id);
    record(
      'a 100% target margin is rejected by the database',
      !!badMargin,
      badMargin ? undefined : 'accepted',
    );

    // -----------------------------------------------------------------------
    // Deleting master data must not destroy estimate history
    // -----------------------------------------------------------------------
    const { data: material } = await admin
      .from('materials')
      .insert({ name: `${RUN_ID} material`, unit_cost: 8.4, unit_of_measure: 'LF' })
      .select('id')
      .single();
    if (material) createdMaterialIds.push(material.id as string);

    const { data: line } = await admin
      .from('estimate_takeoff_items')
      .insert({
        estimate_id: rev1?.id,
        source_material_id: material?.id,
        description: `${RUN_ID} line`,
        quantity: 100,
        unit: 'LF',
        unit_material_cost: 8.4,
      })
      .select('id')
      .single();

    await admin.from('materials').delete().eq('id', material?.id);
    const { data: survivor } = await admin
      .from('estimate_takeoff_items')
      .select('id, source_material_id, unit_material_cost')
      .eq('id', line?.id)
      .maybeSingle();
    const survivorRow = survivor as {
      source_material_id: string | null;
      unit_material_cost: number;
    } | null;
    record(
      'deleting a price-book material leaves the estimate line intact',
      !!survivorRow && survivorRow.source_material_id === null,
      survivorRow ? undefined : 'the line was deleted with the material',
    );
    record(
      'the estimate line keeps its snapshotted price after the material is gone',
      Number(survivorRow?.unit_material_cost) === 8.4,
      `got ${survivorRow?.unit_material_cost}`,
    );

    // -----------------------------------------------------------------------
    // Revisions are independent
    // -----------------------------------------------------------------------
    const { data: rev2 } = await admin
      .from('estimates')
      .insert({
        project_id: project.id,
        parent_estimate_id: rev1?.id,
        estimate_number: RUN_ID.toUpperCase(),
        revision: 2,
      })
      .select('id')
      .single();

    await admin.from('estimate_takeoff_items').update({ quantity: 999 }).eq('id', line?.id);
    const { count: rev2Lines } = await admin
      .from('estimate_takeoff_items')
      .select('id', { count: 'exact', head: true })
      .eq('estimate_id', rev2?.id);
    record('editing revision 1 does not touch revision 2', (rev2Lines ?? 0) === 0);

    await admin.from('estimates').delete().eq('id', rev2?.id);
    const { data: rev1Survives } = await admin
      .from('estimates')
      .select('id')
      .eq('id', rev1?.id)
      .maybeSingle();
    record('deleting a later revision does not remove the earlier one', !!rev1Survives);

    // -----------------------------------------------------------------------
    // Documents bucket must be private
    // -----------------------------------------------------------------------
    const { data: buckets } = await admin.storage.listBuckets();
    const bucketName = process.env.SUPABASE_DOCUMENTS_BUCKET || 'project-documents';
    const bucket = buckets?.find((b) => b.name === bucketName);
    if (!bucket) {
      record(
        `the "${bucketName}" storage bucket exists`,
        false,
        'not found — create it (public access off) or apply migration 005',
      );
    } else {
      record(`the "${bucketName}" storage bucket is private`, bucket.public === false);
    }
  } finally {
    // Cascades remove estimates, lines, scope items and checklist rows.
    for (const id of createdProjectIds) {
      await admin.from('projects').delete().eq('id', id);
    }
    for (const id of createdMaterialIds) {
      await admin.from('materials').delete().eq('id', id);
    }
  }

  const passed = results.filter((result) => result.ok).length;
  console.log(`\n[test-estimating-db] ${passed}/${results.length} passed`);
  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error('');
    for (const failure of failures) {
      console.error(`  ✗ ${failure.name}${failure.detail ? `\n      ${failure.detail}` : ''}`);
    }
    console.error('');
    process.exit(1);
  }
  process.exit(0);
}

void main().catch((error) => {
  console.error(`[test-estimating-db] threw: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
