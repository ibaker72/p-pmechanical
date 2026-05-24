import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  Check,
  ArrowRight,
  Phone,
  MapPin,
} from 'lucide-react';
import { COMMERCIAL_SERVICES, BUSINESS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { InlineLeadForm } from '@/components/forms/InlineLeadForm';
import {
  ServiceSchema,
  FaqSchema,
  BreadcrumbSchema,
  LocalBusinessSchema,
} from '@/components/seo/JsonLd';
import { HowToSchema } from '@/components/seo/HowToSchema';

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

export function generateStaticParams() {
  return COMMERCIAL_SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const s = COMMERCIAL_SERVICES.find((x) => x.slug === params.slug);
  if (!s) return {};
  return {
    title: `${s.name} | Commercial HVAC in North Jersey`,
    description:
      `${s.short} P&P Mechanical serves commercial customers across Clifton, Passaic County, Essex, and Bergen.`.slice(
        0,
        158,
      ),
    alternates: { canonical: `/commercial/${s.slug}` },
    openGraph: {
      title: `${s.name} | Commercial HVAC | ${BUSINESS.name}`,
      description: s.short,
      url: `/commercial/${s.slug}`,
    },
  };
}

export default function CommercialServicePage({ params }: { params: { slug: string } }) {
  const service = COMMERCIAL_SERVICES.find((s) => s.slug === params.slug);
  if (!service) notFound();
  const Icon = ICONS[service.icon] ?? Wrench;
  const related = COMMERCIAL_SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <LocalBusinessSchema />
      <ServiceSchema
        name={service.name}
        description={service.short}
        slug={service.slug}
        urlPath={`/commercial/${service.slug}`}
      />
      <HowToSchema name={service.name} description={service.short} steps={service.process} />
      <FaqSchema faqs={service.faqs} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Commercial', href: '/commercial' },
          { name: service.name, href: `/commercial/${service.slug}` },
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
            <Link href="/commercial" className="hover:text-ember-300">
              Commercial
            </Link>
            <span className="px-2">/</span>
            <span className="text-white">{service.name}</span>
          </nav>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/15 ring-1 ring-ember-500/40">
                <Icon className="h-6 w-6 text-ember-300" />
              </div>
              <h1 className="heading-display text-balance">{service.name}</h1>
              <p className="mt-2 font-display text-xl text-ember-300">
                Commercial · North Jersey · 24/7 Dispatch
              </p>
              <p className="mt-5 max-w-2xl text-lg text-steel-100">{service.description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" variant="primary">
                <Link href="/quote?source=commercial">Talk to Our Commercial Team</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={BUSINESS.phoneHref}>
                  <Phone className="h-4 w-4" /> {BUSINESS.phone}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What's included + Pricing */}
      <section className="py-20 sm:py-24">
        <div className="container-wide grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <span className="eyebrow mb-4">What&apos;s Included</span>
            <h2 className="heading-section text-balance">
              Scope of work — engineered, not estimated.
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {service.whatsIncluded.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                >
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-ember-400" />
                  <span className="text-steel-100">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl border border-ember-500/40 bg-ember-500/5 p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-ember-300">Pricing</p>
            <p className="mt-3 font-display text-3xl text-white">Custom commercial proposal</p>
            <p className="mt-2 text-sm text-steel-200">
              Every commercial job gets an engineered scope, written quote, and a defined schedule
              before any work begins.
            </p>
            <Button asChild size="md" variant="primary" className="mt-6 w-full">
              <Link href="/quote?source=commercial">Request a Proposal</Link>
            </Button>
            <Button asChild size="md" variant="outline" className="mt-3 w-full">
              <a href={BUSINESS.phoneHref}>
                <Phone className="h-4 w-4" /> Call Now
              </a>
            </Button>
          </aside>
        </div>
      </section>

      {/* Process */}
      <section className="border-y border-white/10 bg-ink-900/40 py-20 sm:py-24">
        <div className="container-wide">
          <span className="eyebrow mb-4">Our Process</span>
          <h2 className="heading-section text-balance">How a commercial project runs with us.</h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {service.process.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="mb-4 font-display text-5xl text-ember-500/40">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-display text-xl text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-200">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24">
        <div className="container-tight">
          <span className="eyebrow mb-4">FAQ</span>
          <h2 className="heading-section text-balance">
            Common questions about {service.name.toLowerCase()}.
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {service.faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Inline lead form */}
      <section className="border-t border-white/10 bg-ink-900/40 py-20 sm:py-24">
        <div className="container-tight">
          <div className="mb-10 max-w-2xl">
            <span className="eyebrow mb-4">Request a Proposal</span>
            <h2 className="heading-section text-balance">
              Tell us about your {service.name.toLowerCase()} project.
            </h2>
            <p className="mt-4 text-steel-200">
              We&apos;ll respond within one business day with next steps. For emergencies, dial{' '}
              <a href={BUSINESS.phoneHref} className="font-bold text-ember-300 underline">
                {BUSINESS.phone}
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            <InlineLeadForm defaultService={service.name} source="commercial_service_page" />
          </div>
        </div>
      </section>

      {/* Local + Related */}
      <section className="py-20 sm:py-24">
        <div className="container-wide grid gap-12 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 lg:col-span-1">
            <MapPin className="mb-3 h-6 w-6 text-ember-400" />
            <h3 className="font-display text-2xl text-white">
              Serving commercial accounts across North Jersey
            </h3>
            <p className="mt-3 text-steel-200">
              Dispatch from Clifton with coverage across Passaic, Essex, and Bergen counties.
              Service contracts available with guaranteed response windows.
            </p>
            <Button asChild variant="outline" size="md" className="mt-5">
              <Link href="/locations">See all service areas</Link>
            </Button>
          </div>
          <div className="lg:col-span-2">
            <h3 className="mb-6 font-display text-2xl text-white">Related commercial services</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => {
                const RIcon = ICONS[r.icon] ?? Wrench;
                return (
                  <Link
                    key={r.slug}
                    href={`/commercial/${r.slug}`}
                    className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-ember-400/40"
                  >
                    <RIcon className="h-6 w-6 text-ember-400" />
                    <span className="font-display text-lg text-white group-hover:text-ember-200">
                      {r.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-ember-300">
                      View <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
