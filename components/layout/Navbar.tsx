'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, Phone, X, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/commercial', label: 'Commercial' },
  { href: '/locations', label: 'Service Areas' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-white/10 bg-ink-950/80 backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <div className="container-wide flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label={`${BUSINESS.name} home`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-gradient shadow-emberSoft">
            <Flame className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-wider text-white">
              P&amp;P MECHANICAL
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-ember-300">
              HVAC · Boiler · AC
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-semibold uppercase tracking-wider text-steel-100 hover:text-ember-300"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={BUSINESS.phoneHref}
            className="group flex items-center gap-2 text-sm font-semibold text-white hover:text-ember-300"
          >
            <Phone className="h-4 w-4 text-ember-400 transition-transform group-hover:scale-110" />
            <span>{BUSINESS.phone}</span>
          </a>
          <Button asChild size="md" variant="primary">
            <Link href="/quote">Get Free Quote</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'bg-ink-950/98 fixed inset-0 z-[60] flex flex-col backdrop-blur-xl transition-opacity lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <span className="font-display text-xl tracking-wider text-white">P&amp;P MECHANICAL</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-6 pt-6" aria-label="Mobile">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="border-b border-white/5 py-4 font-display text-2xl text-white hover:text-ember-300"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 p-6">
          <a
            href={BUSINESS.phoneHref}
            className="flex h-12 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 font-semibold text-white"
          >
            <Phone className="h-4 w-4 text-ember-400" /> {BUSINESS.phone}
          </a>
          <Button asChild size="lg" variant="primary" className="w-full">
            <Link href="/quote" onClick={() => setOpen(false)}>
              Get Free Quote
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
