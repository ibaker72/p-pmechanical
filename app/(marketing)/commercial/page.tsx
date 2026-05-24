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
  Clock,
  FileCheck,
  Users,
} from 'lucide-react';
import { COMMERCIAL_SERVICES, BUSINESS } from '@/lib/constants';
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

const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'NJ-Licensed & $2M G/L Insured' },
  { icon: Clock, label: '24/7 Commercial Dispatch' },
  { icon: FileCheck, label: 'Service Contracts & Capital Plans' },
  { icon: Users, label: 'Property Managers · GCs · Owners' },
];

export const metadata: Metadata = {
  title: 'Commercial HVAC Services in North Jersey | P&P Mechanical',
  description:
    'Full-service commercial HVAC across North Jersey — rooftop units, VRF/VRV, chillers, commercial boilers, multi-family, building automation, and 24/7 emergency service.',
  alternates: { canonical: '/commercial' },
  openGraph: {
    title: `Commercial HVAC Services | ${BUSINESS.name}`,
    description:
      'Engineered commercial HVAC, boiler, and controls work at any scale — from a single RTU replacement to a multi-boiler plant rebuild. North Jersey, 24/7.',
    url: '/commercial',
  },
};

export default function CommercialHubPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Commercial', href: '/commercial' },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: COMMERCIAL_SERVICES.map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: s.name,
              url: `${BUSINESS.url}/commercial/${s.slug}`,
            })),
          }),
        }}
      />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">Commercial HVAC · North Jersey</span>
          <h1 className="heading-display max-w-4xl text-balance">
            Full-service commercial HVAC — at any scale, around the clock.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            From a single rooftop replacement to a multi-boiler plant rebuild, our commercial
            division handles HVAC, controls, and ductwork for offices, retail, restaurants,
            warehouses, multi-family, and industrial sites across North Jersey. Engineered designs,
            licensed crews, written documentation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary">
              <Link href="/quote?source=commercial">Talk to Our Commercial Team</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-medium text-steel-100"
              >
                <Icon className="h-4 w-4 text-ember-400" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="container-wide">
          <div className="mb-12 max-w-3xl">
            <span className="eyebrow mb-4">What We Do</span>
            <h2 className="heading-section text-balance">
              Every commercial HVAC discipline, under one contractor.
            </h2>
            <p className="mt-4 text-steel-200">
              We self-perform install, repair, and preventive maintenance across rooftop units,
              VRF/VRV, chillers, boilers, multi-family central plants, building automation, and
              commercial sheet metal. One point of contact for the whole job.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {COMMERCIAL_SERVICES.map((s) => {
              const Icon = ICONS[s.icon] ?? Wrench;
              return (
                <Link
                  key={s.slug}
                  href={`/commercial/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/40 hover:shadow-emberSoft"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/10 ring-1 ring-ember-500/30">
                    <Icon className="h-6 w-6 text-ember-400" />
                  </div>
                  <h2 className="font-display text-2xl text-white">{s.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-steel-200">{s.short}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                    Details
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Residential cross-link */}
          <Link
            href="/services"
            className="group mt-12 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-colors hover:border-ember-400/40 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ember-300">
                Homeowner?
              </p>
              <h2 className="mt-1 font-display text-2xl text-white">
                See our residential services.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-steel-200">
                Furnaces, boilers, central AC, ductless, maintenance plans, and 24/7 emergency
                service for North Jersey homes.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
              Residential services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
