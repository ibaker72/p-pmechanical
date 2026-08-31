'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminNav } from './AdminNav';
import { cn } from '@/lib/utils';

/**
 * Admin chrome. Desktop is the primary target — estimating happens on a
 * laptop — so the sidebar is permanent from `lg` up and collapses to a
 * disclosure below that rather than a modal drawer.
 */
export function AdminShell({
  children,
  identity,
  logout,
}: {
  children: React.ReactNode;
  identity: string;
  logout: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-ink-950/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-display text-sm font-semibold text-white">
          P&amp;P Estimating
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="rounded border border-white/15 px-2.5 py-1 text-xs font-semibold text-steel-200"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </header>

      <aside
        id="admin-nav"
        className={cn(
          'border-b border-white/10 bg-ink-950/80 px-3 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r',
          open ? 'block' : 'hidden lg:block',
        )}
      >
        <div className="mb-5 hidden px-2 lg:block">
          <Link href="/admin" className="font-display text-base font-semibold text-white">
            P&amp;P Estimating
          </Link>
          <p className="mt-0.5 text-[11px] text-steel-500">Commercial mechanical</p>
        </div>

        <AdminNav onNavigate={() => setOpen(false)} />

        <div className="mt-6 border-t border-white/10 pt-3">
          <p className="px-2 text-[11px] text-steel-500">Signed in as</p>
          <p className="truncate px-2 text-xs text-steel-300" title={identity}>
            {identity}
          </p>
          <div className="mt-2 px-2">{logout}</div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main id="admin-main" className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
