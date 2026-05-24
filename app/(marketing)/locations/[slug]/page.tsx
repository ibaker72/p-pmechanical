import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Phone, Building, ArrowRight } from 'lucide-react';
import { LOCATIONS, RESIDENTIAL_SERVICES, BUSINESS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { InlineLeadForm } from '@/components/forms/InlineLeadForm';
import { LocalBusinessSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

export function generateStaticParams() {
  return LOCATIONS.map((l) => ({ slug: l.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const l = LOCATIONS.find((x) => x.slug === params.slug);
  if (!l) return {};
  return {
    title: `HVAC Services in ${l.name}, NJ`,
    description:
      `Licensed HVAC, boiler, and AC service in ${l.name}, NJ from P&P Mechanical. 24/7 emergency dispatch, free estimates, and same-day appointments across ${l.county}.`.slice(
        0,
        158,
      ),
    alternates: { canonical: `/locations/${l.slug}` },
    openGraph: {
      title: `HVAC Services in ${l.name}, NJ | ${BUSINESS.name}`,
      description: `Full-service HVAC for ${l.name} homeowners — installs, repairs, and 24/7 emergency.`,
      url: `/locations/${l.slug}`,
    },
  };
}

export default function LocationPage({ params }: { params: { slug: string } }) {
  const location = LOCATIONS.find((l) => l.slug === params.slug);
  if (!location) notFound();

  const nearby = location.nearby
    .map((slug) => LOCATIONS.find((l) => l.slug === slug))
    .filter(Boolean) as typeof LOCATIONS;

  return (
    <>
      <LocalBusinessSchema city={location.name} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Service Areas', href: '/locations' },
          { name: location.name, href: `/locations/${location.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 py-20 sm:py-28">
        <div aria-hidden className="absolute inset-0 bg-hero-noise opacity-90" />
        <div
          aria-hidden
          className="absolute inset-0 bg-grid-faint bg-[length:64px_64px] opacity-20"
        />
        <div className="container-wide relative">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-xs uppercase tracking-widest text-steel-300"
          >
            <Link href="/" className="hover:text-ember-300">
              Home
            </Link>
            <span className="px-2">/</span>
            <Link href="/locations" className="hover:text-ember-300">
              Service Areas
            </Link>
            <span className="px-2">/</span>
            <span className="text-white">{location.name}, NJ</span>
          </nav>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-ember-300">
            <MapPin className="h-4 w-4" /> {location.county} · {location.zip}
          </div>
          <h1 className="heading-display mt-3 text-balance">
            HVAC Services in {location.name}, NJ
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-steel-100">{location.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary">
              <Link href="/quote">Get a Free Quote</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={BUSINESS.phoneHref}>
                <Phone className="h-4 w-4" /> {BUSINESS.phone}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services list */}
      <section className="py-20 sm:py-24">
        <div className="container-wide">
          <div className="mb-12 max-w-2xl">
            <span className="eyebrow mb-4">Local Services</span>
            <h2 className="heading-section text-balance">
              What we do for {location.name} homeowners.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RESIDENTIAL_SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:-translate-y-0.5 hover:border-ember-400/40"
              >
                <h3 className="font-display text-xl text-white group-hover:text-ember-200">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-200">{s.short}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-xs font-bold uppercase tracking-widest text-ember-300">
                  Learn more <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/commercial"
            className="group mt-8 flex items-center justify-between gap-4 rounded-2xl border border-ember-500/30 bg-ember-500/5 p-6 transition-colors hover:border-ember-400/60 hover:bg-ember-500/10"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ember-300">
                For businesses in {location.name}
              </p>
              <p className="mt-1 font-display text-lg text-white">
                We also do full-service commercial HVAC here.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
              Commercial services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* Local trust */}
      <section className="border-y border-white/10 bg-ink-900/40 py-20 sm:py-24">
        <div className="container-tight">
          <div className="flex items-start gap-5">
            <Building className="mt-1 h-10 w-10 shrink-0 text-ember-400" />
            <div>
              <span className="eyebrow mb-3">Local knowledge</span>
              <h2 className="heading-section text-balance">
                Our techs know {location.name}&apos;s housing stock.
              </h2>
              <p className="mt-5 text-lg text-steel-100">{location.housingNote}</p>
              <p className="mt-3 text-steel-200">
                That matters. The difference between an HVAC contractor who has worked your block
                for years and one who just shows up with a brochure is the difference between a
                clean, code-compliant install and a system that fights your home every day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inline form */}
      <section className="py-20 sm:py-24">
        <div className="container-tight">
          <div className="mb-10 max-w-2xl">
            <span className="eyebrow mb-4">Request Service</span>
            <h2 className="heading-section text-balance">Get a free quote in {location.name}.</h2>
            <p className="mt-4 text-steel-200">
              We respond within 2 hours during business hours. For emergencies, call{' '}
              <a href={BUSINESS.phoneHref} className="font-bold text-ember-300 underline">
                {BUSINESS.phone}
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            <InlineLeadForm city={location.name} source="location_page" />
          </div>
        </div>
      </section>

      {/* Nearby */}
      <section className="border-t border-white/10 bg-ink-900/30 py-16">
        <div className="container-wide">
          <h3 className="mb-6 font-display text-2xl text-white">Nearby service areas</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((n) => (
              <Link
                key={n.slug}
                href={`/locations/${n.slug}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-ember-400/40"
              >
                <MapPin className="h-4 w-4 text-ember-400" />
                <span className="font-display text-lg text-white">{n.name}, NJ</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
