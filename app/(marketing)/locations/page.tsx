import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { LOCATIONS, ALL_SERVICE_AREAS, BUSINESS } from '@/lib/constants';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'HVAC Service Areas Across North Jersey',
  description:
    'P&P Mechanical serves Clifton, Passaic, Paterson, Wayne, Bloomfield, Montclair, Nutley, East Orange and surrounding North Jersey towns with 24/7 HVAC, boiler, and AC service.',
  alternates: { canonical: '/locations' },
};

export default function LocationsHubPage() {
  const linked = new Set(LOCATIONS.map((l) => l.name));
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Service Areas', href: '/locations' }]} />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">Service Areas</span>
          <h1 className="heading-display max-w-3xl text-balance">
            North Jersey HVAC, block by block.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            Dispatched from Clifton, our trucks cover every major town across Passaic and Essex counties — and most of Bergen.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary">
              <Link href="/quote">Get a Free Quote</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-wide">
          <h2 className="mb-8 font-display text-2xl text-white">Cities we cover in depth</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {LOCATIONS.map((l) => (
              <Link
                key={l.slug}
                href={`/locations/${l.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/40 hover:shadow-emberSoft"
              >
                <div className="mb-4 flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-ember-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-ember-300">
                    {l.county}
                  </span>
                </div>
                <h3 className="font-display text-2xl text-white">{l.name}, NJ</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-steel-200">{l.intro}</p>
                <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                  Local details
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            ))}
          </div>

          <h2 className="mb-6 mt-16 font-display text-2xl text-white">Also serving</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_SERVICE_AREAS.filter((c) => !linked.has(c)).map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-steel-100"
              >
                {c}, NJ
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
