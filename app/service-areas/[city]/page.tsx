import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Flame,
  Snowflake,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactForm } from '@/components/forms/ContactForm';
import { LocalBusinessSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

const DISPATCH_PHONE_DISPLAY = '(201) 456-5151';
const DISPATCH_PHONE_HREF = 'tel:+12014565151';

export const TARGET_CITIES = [
  'clifton',
  'passaic',
  'paterson',
  'wayne',
  'bloomfield',
  'montclair',
  'nutley',
  'east-orange',
] as const;

export type TargetCitySlug = (typeof TARGET_CITIES)[number];

export function formatCitySlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function generateStaticParams() {
  return TARGET_CITIES.map((city) => ({ city }));
}

export function generateMetadata({
  params,
}: {
  params: { city: string };
}): Metadata {
  if (!TARGET_CITIES.includes(params.city as TargetCitySlug)) return {};
  const cityName = formatCitySlug(params.city);
  const title = `Premium HVAC, Boiler & AC Services in ${cityName}, NJ`;
  const description = `24/7 emergency HVAC dispatch and precision install work in ${cityName}, NJ. Licensed boiler, furnace, and AC specialists serving Passaic & Essex counties.`;
  return {
    title,
    description,
    alternates: { canonical: `/service-areas/${params.city}` },
    openGraph: {
      title,
      description,
      url: `/service-areas/${params.city}`,
    },
  };
}

const LOCAL_SERVICES = [
  {
    icon: Flame,
    title: 'Boiler Install & Repair',
    copy: 'High-efficiency condensing boilers, steam-to-steam swaps, and 24/7 no-heat emergency dispatch.',
  },
  {
    icon: Snowflake,
    title: 'Central AC & Mini-Splits',
    copy: 'Right-sized cooling systems engineered for NJ humidity. Same-day repair when it counts.',
  },
  {
    icon: Wrench,
    title: 'Furnace & HVAC Service',
    copy: 'Annual tune-ups, full system replacements, and precision Manual J load calculations.',
  },
];

const TRUST_POINTS = [
  { icon: Clock, label: '24/7 Live Dispatch' },
  { icon: ShieldCheck, label: 'Licensed & Insured in NJ' },
  { icon: MapPin, label: 'Local Crews, Fast Arrival' },
];

export default function ServiceAreaCityPage({
  params,
}: {
  params: { city: string };
}) {
  if (!TARGET_CITIES.includes(params.city as TargetCitySlug)) notFound();

  const cityName = formatCitySlug(params.city);

  return (
    <>
      <LocalBusinessSchema city={cityName} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Service Areas', href: '/service-areas' },
          { name: `${cityName}, NJ`, href: `/service-areas/${params.city}` },
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
            <Link href="/service-areas" className="hover:text-ember-300">
              Service Areas
            </Link>
            <span className="px-2">/</span>
            <span className="text-white">{cityName}, NJ</span>
          </nav>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ember-300">
            <MapPin className="h-4 w-4" />
            Now Serving {cityName} · Passaic & Essex Counties
          </div>

          <h1 className="mt-4 heading-display text-balance">
            Premium HVAC, Boiler, & AC Services in{' '}
            <span className="text-ember-400">{cityName}</span>, NJ
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-steel-100">
            Providing 24/7 emergency dispatch and precision install jobs to
            homeowners across {cityName} and the surrounding Passaic and Essex
            County neighborhoods. Real techs, transparent flat-rate pricing,
            and equipment sized to your home — not guessed from a brochure.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="emergency">
              <a
                href={DISPATCH_PHONE_HREF}
                data-cta="city-hero-call"
                data-city={cityName}
              >
                <Phone className="h-4 w-4" /> Call {DISPATCH_PHONE_DISPLAY}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link
                href={`/quote?city=${encodeURIComponent(cityName)}`}
                data-cta="city-hero-quote"
                data-city={cityName}
              >
                Get a Free {cityName} Quote <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ul className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-steel-100"
              >
                <Icon className="h-4 w-4 text-ember-400" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Services */}
      <section className="border-b border-white/10 py-20">
        <div className="container-wide">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-ember-300">
              What we do in {cityName}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">
              Full-service HVAC for {cityName} homeowners.
            </h2>
            <p className="mt-4 text-steel-200">
              From cast-iron boiler swaps in older {cityName} homes to
              high-efficiency central AC retrofits, our NJ-licensed crews
              handle the work end-to-end — permits, install, and a clean
              walkthrough.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {LOCAL_SERVICES.map(({ icon: Icon, title, copy }) => (
              <article
                key={title}
                className="group rounded-2xl border border-white/10 bg-ink-900/60 p-6 transition-all hover:border-ember-400/40 hover:shadow-emberSoft"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/10 text-ember-400 ring-1 ring-ember-500/30">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-200">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency band */}
      <section className="border-b border-white/10 bg-gradient-to-r from-ember-700/30 via-ember-600/20 to-transparent py-16">
        <div className="container-wide flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ember-300">
              No heat? No AC? No problem.
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
              24/7 emergency dispatch to {cityName}.
            </h2>
            <p className="mt-2 max-w-xl text-steel-100">
              Talk to a real technician in under 60 seconds — most calls land a
              truck at your door inside two hours.
            </p>
          </div>
          <Button asChild size="lg" variant="primary">
            <a
              href={DISPATCH_PHONE_HREF}
              data-cta="city-emergency-call"
              data-city={cityName}
            >
              <Phone className="h-4 w-4" /> Tap to Call {DISPATCH_PHONE_DISPLAY}
            </a>
          </Button>
        </div>
      </section>

      {/* Intake form */}
      <section className="py-20">
        <div className="container-wide grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ember-300">
              Book a {cityName} Visit
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">
              Get a free, no-pressure estimate.
            </h2>
            <p className="mt-4 text-steel-200">
              Tell us what you need and we&apos;ll dispatch a technician to
              your {cityName} address. We respond within two hours during
              business windows — and 24/7 for true emergencies.
            </p>
            <div className="mt-8 space-y-3 text-sm text-steel-100">
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-ember-400" />
                <a
                  href={DISPATCH_PHONE_HREF}
                  className="font-semibold text-white hover:text-ember-300"
                >
                  {DISPATCH_PHONE_DISPLAY}
                </a>
                <span className="text-steel-400">· 24/7 dispatch</span>
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-ember-400" />
                Serving {cityName} & all of Passaic / Essex / Bergen County
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-6 shadow-emberSoft sm:p-8">
            <ContactForm defaultCity={cityName} source={`city_page:${params.city}`} />
          </div>
        </div>
      </section>
    </>
  );
}
