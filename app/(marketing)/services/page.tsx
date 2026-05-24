import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wrench,
  Cog,
  Flame,
  Thermometer,
  Snowflake,
  Wind,
  Siren,
  ShieldCheck,
  Building,
  Building2,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import { RESIDENTIAL_SERVICES, BUSINESS } from '@/lib/constants';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/button';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  Cog,
  Flame,
  Thermometer,
  Snowflake,
  Wind,
  Siren,
  ShieldCheck,
  Building,
  Building2,
};

export const metadata: Metadata = {
  title: 'Residential HVAC, Boiler & AC Services in Clifton, NJ',
  description:
    'Complete residential HVAC, boiler, AC, and emergency services from P&P Mechanical — serving Clifton, Passaic County, and all of North Jersey. Licensed, insured, 24/7.',
  alternates: { canonical: '/services' },
};

export default function ServicesHubPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Services', href: '/services' },
        ]}
      />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">Residential Services</span>
          <h1 className="heading-display max-w-4xl text-balance">
            Every HVAC service your North Jersey home will ever need.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            From a same-day capacitor swap to a full high-efficiency boiler replacement — we do it
            all, and we do it the right way. Running a business?{' '}
            <Link
              href="/commercial"
              className="font-semibold text-ember-300 underline underline-offset-4 hover:text-ember-200"
            >
              See our commercial services →
            </Link>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {RESIDENTIAL_SERVICES.map((s) => {
              const Icon = ICONS[s.icon] ?? Wrench;
              return (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/40 hover:shadow-emberSoft"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/10 ring-1 ring-ember-500/30">
                    <Icon className="h-6 w-6 text-ember-400" />
                  </div>
                  <h2 className="font-display text-2xl text-white">{s.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-steel-200">{s.short}</p>
                  {s.startingPrice && (
                    <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ember-300">
                      {s.startingPrice}
                    </p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                    Details
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Commercial cross-sell strip */}
          <Link
            href="/commercial"
            className="group mt-12 flex flex-col gap-4 rounded-2xl border border-ember-500/30 bg-ember-500/5 p-8 transition-colors hover:border-ember-400/60 hover:bg-ember-500/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ember-500/15 ring-1 ring-ember-500/40">
                <Building2 className="h-6 w-6 text-ember-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-ember-300">
                  For businesses
                </p>
                <h2 className="mt-1 font-display text-2xl text-white">
                  We also do full-service commercial HVAC.
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-steel-200">
                  Rooftop units, VRF/VRV, chillers, commercial boilers, multi-family, building
                  automation, and 24/7 commercial emergency service — at any scale.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
              See commercial services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
