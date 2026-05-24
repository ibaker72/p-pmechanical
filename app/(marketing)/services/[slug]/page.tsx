import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Wrench, Cog, Flame, Thermometer, Snowflake, Wind, Siren, ShieldCheck,
  Check, ArrowRight, Phone, MapPin,
} from 'lucide-react';
import { SERVICES, BUSINESS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import { InlineLeadForm } from '@/components/forms/InlineLeadForm';
import { ServiceSchema, FaqSchema, BreadcrumbSchema, LocalBusinessSchema } from '@/components/seo/JsonLd';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench, Cog, Flame, Thermometer, Snowflake, Wind, Siren, ShieldCheck,
};

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const s = SERVICES.find((x) => x.slug === params.slug);
  if (!s) return {};
  return {
    title: `${s.name} in Clifton, NJ`,
    description: `${s.short} P&P Mechanical serves Clifton, Passaic County, and surrounding North Jersey areas with same-day service.`.slice(0, 158),
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: {
      title: `${s.name} in Clifton, NJ | ${BUSINESS.name}`,
      description: s.short,
      url: `/services/${s.slug}`,
    },
  };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = SERVICES.find((s) => s.slug === params.slug);
  if (!service) notFound();
  const Icon = ICONS[service.icon] ?? Wrench;
  const related = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <LocalBusinessSchema />
      <ServiceSchema name={service.name} description={service.short} slug={service.slug} />
      <FaqSchema faqs={service.faqs} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Services', href: '/services' },
          { name: service.name, href: `/services/${service.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 py-20 sm:py-28">
        <div aria-hidden className="absolute inset-0 bg-hero-noise opacity-90" />
        <div aria-hidden className="absolute inset-0 bg-grid-faint bg-[length:64px_64px] opacity-20" />
        <div className="container-wide relative">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs uppercase tracking-widest text-steel-300">
            <Link href="/" className="hover:text-ember-300">Home</Link>
            <span className="px-2">/</span>
            <Link href="/services" className="hover:text-ember-300">Services</Link>
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
                Clifton · Passaic · Paterson · all of North Jersey
              </p>
              <p className="mt-5 max-w-2xl text-lg text-steel-100">{service.description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
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
        </div>
      </section>

      {/* What's included + Pricing */}
      <section className="py-20 sm:py-24">
        <div className="container-wide grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <span className="eyebrow mb-4">What&apos;s Included</span>
            <h2 className="heading-section text-balance">Everything covered, nothing hidden.</h2>
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
            <p className="mt-3 font-display text-4xl text-white">
              {service.startingPrice || 'Custom quote'}
            </p>
            <p className="mt-2 text-sm text-steel-200">
              We give you a firm, written, flat-rate price before any work begins — never an hourly meter.
            </p>
            <Button asChild size="md" variant="primary" className="mt-6 w-full">
              <Link href="/quote">Get Your Quote</Link>
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
          <h2 className="heading-section text-balance">How we get from call to comfort.</h2>
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
            <span className="eyebrow mb-4">Request Service</span>
            <h2 className="heading-section text-balance">
              Tell us about your {service.name.toLowerCase()} project.
            </h2>
            <p className="mt-4 text-steel-200">
              We&apos;ll call you back within 2 hours with next steps. For emergencies, dial{' '}
              <a href={BUSINESS.phoneHref} className="font-bold text-ember-300 underline">
                {BUSINESS.phone}
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            <InlineLeadForm defaultService={service.name} source="service_page" />
          </div>
        </div>
      </section>

      {/* Local + Related */}
      <section className="py-20 sm:py-24">
        <div className="container-wide grid gap-12 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 lg:col-span-1">
            <MapPin className="mb-3 h-6 w-6 text-ember-400" />
            <h3 className="font-display text-2xl text-white">Serving Clifton, NJ and surrounding areas</h3>
            <p className="mt-3 text-steel-200">
              Our dispatch is based in Clifton, with tight arrival windows across Passaic and Essex counties.
            </p>
            <Button asChild variant="outline" size="md" className="mt-5">
              <Link href="/locations">See all service areas</Link>
            </Button>
          </div>
          <div className="lg:col-span-2">
            <h3 className="mb-6 font-display text-2xl text-white">Related services</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => {
                const RIcon = ICONS[r.icon] ?? Wrench;
                return (
                  <Link
                    key={r.slug}
                    href={`/services/${r.slug}`}
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
