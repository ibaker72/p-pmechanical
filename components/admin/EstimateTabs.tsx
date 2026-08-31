'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { segment: 'overview', label: 'Overview' },
  { segment: 'scope', label: 'Scope' },
  { segment: 'takeoff', label: 'Takeoff' },
  { segment: 'materials', label: 'Materials' },
  { segment: 'labor', label: 'Labor' },
  { segment: 'equipment', label: 'Equipment' },
  { segment: 'subcontractors', label: 'Subcontractors' },
  { segment: 'pricing', label: 'Pricing' },
  { segment: 'checklist', label: 'Bid review' },
  { segment: 'proposal', label: 'Proposal' },
] as const;

export function EstimateTabs({
  estimateId,
  unresolvedCount,
}: {
  estimateId: string;
  unresolvedCount: number;
}) {
  const pathname = usePathname();
  const base = `/admin/estimates/${estimateId}`;

  return (
    <div className="-mx-4 mb-5 overflow-x-auto border-b border-white/10 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <nav aria-label="Estimate sections" className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = `${base}/${tab.segment}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.segment}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative whitespace-nowrap px-3 py-2 text-sm transition-colors',
                active
                  ? 'font-semibold text-ember-300 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-ember-400'
                  : 'text-steel-400 hover:text-white',
              )}
            >
              {tab.label}
              {tab.segment === 'checklist' && unresolvedCount > 0 && (
                <span className="ml-1.5 rounded bg-ember-500/20 px-1 text-[10px] font-semibold tabular-nums text-ember-200">
                  {unresolvedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
