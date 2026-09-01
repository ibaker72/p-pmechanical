import Link from 'next/link';
import type { Metadata } from 'next';
import { listAssemblies } from '@/lib/estimating/queries';
import {
  Badge,
  Callout,
  EmptyState,
  PageHeader,
  Panel,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { AssemblyRowActions } from '@/components/admin/catalog/AssemblyForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Assemblies' };
export const dynamic = 'force-dynamic';

export default async function AssembliesPage() {
  let assemblies;
  try {
    assemblies = await listAssemblies(true);
  } catch (error) {
    return (
      <>
        <PageHeader title="Assemblies" />
        <SetupNotice error={describeThrown(error, 'listAssemblies')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Assemblies"
        subtitle="Reusable installed work. Add one to an estimate and it explodes into priced lines."
        actions={
          <Link
            href="/admin/assemblies/new"
            className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
          >
            New assembly
          </Link>
        }
      />

      <Callout tone="info" title="Assemblies are where the company's estimating knowledge lives">
        A well-built assembly encodes what a job actually takes — the equipment, the fittings, the
        crane time, the startup hours. Each time one is used, the bid gets faster and more
        consistent. Editing an assembly never changes an estimate that already used it.
      </Callout>

      <Panel className="mt-6">
        {assemblies.length === 0 ? (
          <EmptyState
            title="No assemblies yet"
            description="Start with the work PP Mechanical repeats most: a standard RTU installation, a VAV box, installed pipe by the foot."
            action={
              <Link
                href="/admin/assemblies/new"
                className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
              >
                New assembly
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Assembly</TH>
                  <TH>Code</TH>
                  <TH>Scope</TH>
                  <TH>Unit</TH>
                  <TH align="right">Components</TH>
                  <TH align="right">Version</TH>
                  <TH align="right">Actions</TH>
                </tr>
              </thead>
              <tbody>
                {assemblies.map((assembly) => (
                  <tr key={assembly.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/assemblies/${assembly.id}`}
                          className="font-medium text-white hover:text-ember-300"
                        >
                          {assembly.name}
                        </Link>
                        {!assembly.is_active && <Badge tone="muted">Inactive</Badge>}
                      </div>
                      {assembly.description && (
                        <div className="max-w-md truncate text-[11px] text-steel-500">
                          {assembly.description}
                        </div>
                      )}
                    </TD>
                    <TD className="font-mono text-xs text-steel-400">{assembly.code ?? '—'}</TD>
                    <TD className="text-xs text-steel-300">
                      {assembly.scope_category?.name ?? '—'}
                    </TD>
                    <TD className="text-xs text-steel-400">{assembly.unit}</TD>
                    <TD align="right" numeric>
                      {assembly.item_count}
                    </TD>
                    <TD align="right" numeric className="text-steel-400">
                      v{assembly.version}
                    </TD>
                    <TD align="right">
                      <AssemblyRowActions id={assembly.id} name={assembly.name} />
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
