import { BUSINESS, ALL_SERVICE_AREAS } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

function Script({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function LocalBusinessSchema({ city }: { city?: string }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'HVACBusiness',
        name: BUSINESS.name,
        url: SITE_URL,
        telephone: BUSINESS.phone,
        email: BUSINESS.email,
        image: `${SITE_URL}/opengraph-image`,
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          addressLocality: city || BUSINESS.address.city,
          addressRegion: BUSINESS.address.region,
          postalCode: BUSINESS.address.postalCode,
          addressCountry: BUSINESS.address.country,
        },
        areaServed: ALL_SERVICE_AREAS,
        openingHours: BUSINESS.hours,
        sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram, BUSINESS.social.google],
      }}
    />
  );
}

export function ServiceSchema({
  name,
  description,
  slug,
  urlPath,
}: {
  name: string;
  description: string;
  slug: string;
  urlPath?: string;
}) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: name,
        name,
        description,
        provider: {
          '@type': 'HVACBusiness',
          name: BUSINESS.name,
          url: SITE_URL,
          telephone: BUSINESS.phone,
        },
        areaServed: ALL_SERVICE_AREAS.map((c) => ({
          '@type': 'City',
          name: c,
        })),
        url: `${SITE_URL}${urlPath ?? `/services/${slug}`}`,
      }}
    />
  );
}

export function FaqSchema({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; href: string }[] }) {
  return (
    <Script
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.href.startsWith('http') ? item.href : `${SITE_URL}${item.href}`,
        })),
      }}
    />
  );
}
