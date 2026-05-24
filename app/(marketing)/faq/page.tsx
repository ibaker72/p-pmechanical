import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { BreadcrumbSchema, FaqSchema } from '@/components/seo/JsonLd';
import { BUSINESS, GENERAL_FAQS, SERVICES } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'HVAC & Boiler FAQ — Clifton, NJ',
  description:
    'Straight answers to the questions North Jersey homeowners ask most about HVAC, boilers, AC, emergency service, pricing, rebates, and maintenance. From the team at P&P Mechanical.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'HVAC & Boiler FAQ | P&P Mechanical',
    description:
      'Plain-English answers about HVAC, boilers, AC, and emergency service in Clifton and North Jersey.',
    url: '/faq',
    type: 'website',
  },
};

type FlatFaq = { q: string; a: string; category: string; serviceSlug?: string };

function collectFaqs(): FlatFaq[] {
  const general = GENERAL_FAQS.map((f) => ({ ...f }));
  const service = SERVICES.flatMap((s) =>
    s.faqs.map((f) => ({ q: f.q, a: f.a, category: s.name, serviceSlug: s.slug })),
  );
  return [...general, ...service];
}

function groupByCategory(
  faqs: FlatFaq[],
): { category: string; items: FlatFaq[]; serviceSlug?: string }[] {
  const map = new Map<string, { category: string; items: FlatFaq[]; serviceSlug?: string }>();
  for (const f of faqs) {
    const k = f.category;
    if (!map.has(k)) map.set(k, { category: k, items: [], serviceSlug: f.serviceSlug });
    map.get(k)!.items.push(f);
  }
  return [...map.values()];
}

export default function FaqPage() {
  const faqs = collectFaqs();
  const groups = groupByCategory(faqs);

  return (
    <>
      <FaqSchema faqs={faqs.map((f) => ({ q: f.q, a: f.a }))} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'FAQ', href: '/faq' },
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
            <span className="text-white">FAQ</span>
          </nav>
          <div className="max-w-3xl">
            <span className="eyebrow mb-4">Answers</span>
            <h1 className="heading-display text-balance">
              Straight answers to the questions North Jersey homeowners ask most.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-steel-100">
              {faqs.length} questions covering pricing, equipment, service areas, emergencies,
              permits, and maintenance — answered by NJ-licensed HVAC contractors. Don&apos;t see
              your question?{' '}
              <a href={BUSINESS.phoneHref} className="font-bold text-ember-300 underline">
                Call us
              </a>{' '}
              — a real person picks up 24/7.
            </p>
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
        </div>
      </section>

      {/* Category nav */}
      <section className="border-b border-white/10 py-8">
        <div className="container-wide">
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.category}>
                <a
                  href={`#${slugify(g.category)}`}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-steel-100 hover:border-ember-400/50 hover:text-ember-200"
                >
                  {g.category}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Groups */}
      <section className="py-16 sm:py-20">
        <div className="container-tight space-y-14">
          {groups.map((g) => (
            <div key={g.category} id={slugify(g.category)} className="scroll-mt-24">
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 className="heading-section">{g.category}</h2>
                {g.serviceSlug && (
                  <Link
                    href={`/services/${g.serviceSlug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-widest text-ember-300 hover:text-ember-200"
                  >
                    See service <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <Accordion type="single" collapsible>
                {g.items.map((f, i) => (
                  <AccordionItem key={`${g.category}-${i}`} value={`${g.category}-${i}`}>
                    <AccordionTrigger>{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10 bg-ink-900/40 py-16">
        <div className="container-tight text-center">
          <h2 className="heading-section text-balance">Still need an answer?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-steel-200">
            We answer the phone 24/7. Whether you need a same-day repair or a free in-home quote,
            the fastest path is a direct call.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="primary">
              <a href={BUSINESS.phoneHref}>
                <Phone className="h-4 w-4" /> Call {BUSINESS.phone}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Send a message</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
