import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Phone, Building, ArrowRight } from 'lucide-react';
import { LOCATIONS, RESIDENTIAL_SERVICES, BUSINESS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { InlineLeadForm } from '@/components/forms/InlineLeadForm';
import { LocalBusinessSchema, BreadcrumbSchema, FaqSchema } from '@/components/seo/JsonLd';
import {
  getPublishedGeoPageBySlug,
  listPublishedGeoPages,
  type GeoPageRow,
} from '@/lib/geo/repository';
import { findExpansionLocation } from '@/lib/geo/locations';

// Allow ISR-style rendering for AI-generated cities not in the static list.
export const dynamicParams = true;
// Re-fetch DB-backed pages periodically without a redeploy.
export const revalidate = 3600;

export async function generateStaticParams() {
  const staticSlugs = LOCATIONS.map((l) => ({ slug: l.slug }));
  const staticSet = new Set(LOCATIONS.map((l) => l.slug));
  const published = await listPublishedGeoPages();
  const aiSlugs = published.filter((p) => !staticSet.has(p.slug)).map((p) => ({ slug: p.slug }));
  return [...staticSlugs, ...aiSlugs];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const staticLocation = LOCATIONS.find((x) => x.slug === params.slug);
  if (staticLocation) {
    return {
      title: `HVAC Services in ${staticLocation.name}, NJ`,
      description:
        `Licensed HVAC, boiler, and AC service in ${staticLocation.name}, NJ from P&P Mechanical. 24/7 emergency dispatch, free estimates, and same-day appointments across ${staticLocation.county}.`.slice(
          0,
          158,
        ),
      alternates: { canonical: `/locations/${staticLocation.slug}` },
      openGraph: {
        title: `HVAC Services in ${staticLocation.name}, NJ | ${BUSINESS.name}`,
        description: `Full-service HVAC for ${staticLocation.name} homeowners — installs, repairs, and 24/7 emergency.`,
        url: `/locations/${staticLocation.slug}`,
      },
    };
  }

  const dbPage = await getPublishedGeoPageBySlug(params.slug);
  if (!dbPage) return {};
  const title = dbPage.title || `HVAC Services in ${dbPage.city}, ${dbPage.state}`;
  const description =
    dbPage.meta_description ||
    `HVAC service in ${dbPage.city}, ${dbPage.state} from ${BUSINESS.name}.`;
  return {
    title,
    description: description.slice(0, 158),
    alternates: { canonical: `/locations/${dbPage.slug}` },
    openGraph: {
      title: `${title} | ${BUSINESS.name}`,
      description: description.slice(0, 158),
      url: `/locations/${dbPage.slug}`,
    },
  };
}

export default async function LocationPage({ params }: { params: { slug: string } }) {
  // Priority 1: hardcoded static city — render existing rich layout unchanged.
  const staticLocation = LOCATIONS.find((l) => l.slug === params.slug);
  if (staticLocation) {
    return <StaticLocationView slug={params.slug} />;
  }

  // Priority 2: AI-generated DB-backed page.
  const dbPage = await getPublishedGeoPageBySlug(params.slug);
  if (dbPage) {
    return <GeneratedLocationView page={dbPage} />;
  }

  notFound();
}

// ---------------------------------------------------------------------------
// Static render path — IDENTICAL to the original page logic. Do not change.
// ---------------------------------------------------------------------------
function StaticLocationView({ slug }: { slug: string }) {
  const location = LOCATIONS.find((l) => l.slug === slug)!;
  const nearby = location.nearby
    .map((s) => LOCATIONS.find((l) => l.slug === s))
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

// ---------------------------------------------------------------------------
// AI-generated DB-backed render path. Uses the same style tokens as the
// static layout (ink/ember/steel, heading-display, Button variants) so the
// two paths feel consistent.
// ---------------------------------------------------------------------------
function GeneratedLocationView({ page }: { page: GeoPageRow }) {
  const expansion = findExpansionLocation(page.slug);
  const county = expansion?.county;
  const cityState = `${page.city}, ${page.state}`;
  const heading = page.h1 || `HVAC Services in ${cityState}`;
  const intro = page.intro_copy || '';
  const faqs = Array.isArray(page.faq_json) ? page.faq_json : [];
  const html = page.page_content_html || '';

  return (
    <>
      <LocalBusinessSchema city={page.city} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Service Areas', href: '/locations' },
          { name: page.city, href: `/locations/${page.slug}` },
        ]}
      />
      {faqs.length > 0 && <FaqSchema faqs={faqs.map((f) => ({ q: f.question, a: f.answer }))} />}

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
            <span className="text-white">{cityState}</span>
          </nav>
          {county && (
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-ember-300">
              <MapPin className="h-4 w-4" /> {county}
            </div>
          )}
          <h1 className="heading-display mt-3 text-balance">{heading}</h1>
          {intro && <p className="mt-6 max-w-3xl text-lg text-steel-100">{intro}</p>}
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

      {/* Generated body */}
      <section className="py-20 sm:py-24">
        <div className="container-tight">
          <article
            className="prose prose-invert prose-headings:font-display prose-headings:text-white prose-h2:heading-section prose-h2:mt-12 prose-h3:font-display prose-h3:text-xl prose-h3:text-white prose-p:text-steel-100 prose-a:text-ember-300 hover:prose-a:text-ember-200 prose-a:font-bold max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      {/* Services overview link */}
      <section className="border-y border-white/10 bg-ink-900/40 py-16">
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="eyebrow mb-3">Explore services</span>
              <h2 className="font-display text-3xl text-white">
                Residential and commercial HVAC across North Jersey.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/services">View Services</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/commercial">Commercial HVAC</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Inline lead form */}
      <section className="py-20 sm:py-24">
        <div className="container-tight">
          <div className="mb-10 max-w-2xl">
            <span className="eyebrow mb-4">Request Service</span>
            <h2 className="heading-section text-balance">Get a free quote in {page.city}.</h2>
            <p className="mt-4 text-steel-200">
              Tell us what you need — we&apos;ll follow up to confirm timing. For urgent service,
              call{' '}
              <a href={BUSINESS.phoneHref} className="font-bold text-ember-300 underline">
                {BUSINESS.phone}
              </a>
              .
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            <InlineLeadForm city={page.city} source="location_page" />
          </div>
        </div>
      </section>
    </>
  );
}
