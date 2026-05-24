import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wrench, Cog, Flame, Thermometer, Snowflake, Wind, Siren, ShieldCheck, ArrowUpRight,
} from 'lucide-react';
import { SERVICES, BUSINESS } from '@/lib/constants';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/button';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench, Cog, Flame, Thermometer, Snowflake, Wind, Siren, ShieldCheck,
};

export const metadata: Metadata = {
  title: 'HVAC, Boiler & AC Services in Clifton, NJ',
  description:
    'Complete HVAC, boiler, AC, and emergency services from P&P Mechanical — serving Clifton, Passaic County, and all of North Jersey. Licensed, insured, 24/7.',
  alternates: { canonical: '/services' },
};

export default function ServicesHubPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Services', href: '/services' }]} />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">Services</span>
          <h1 className="heading-display max-w-4xl text-balance">
            Every HVAC service your North Jersey home or business needs.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            From a same-day capacitor swap to a full high-efficiency boiler replacement — we do it all,
            and we do it the right way.
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
            {SERVICES.map((s) => {
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
                  <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                    Details
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
