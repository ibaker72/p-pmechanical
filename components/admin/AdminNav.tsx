'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: 'Bidding',
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/projects', label: 'Projects' },
      { href: '/admin/estimates', label: 'Estimates' },
      { href: '/admin/jobs', label: 'Jobs' },
    ],
  },
  {
    label: 'Cost library',
    items: [
      { href: '/admin/assemblies', label: 'Assemblies' },
      { href: '/admin/materials', label: 'Materials' },
      { href: '/admin/labor-rates', label: 'Labor rates' },
      { href: '/admin/labor-modifiers', label: 'Labor modifiers' },
      { href: '/admin/equipment-rates', label: 'Equipment rates' },
      { href: '/admin/vendors', label: 'Vendors & subs' },
      { href: '/admin/scope-categories', label: 'Scope categories' },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="space-y-5">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-steel-500">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block rounded px-2 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-ember-500/15 font-semibold text-ember-200'
                        : 'text-steel-300 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
