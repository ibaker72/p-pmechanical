// JSON-LD schema builders. Pure functions that return plain objects; render
// them with the <JsonLd> component below. No fake ratings, reviews, license
// numbers, addresses, or hours are emitted here — only verified business data.

import { BUSINESS, ALL_SERVICE_AREAS, SERVICE_AREA_GEO, type Service } from '@/lib/constants';
import { SITE, siteUrl, getCanonical } from '@/lib/seo/site';

type Faq = { q: string; a: string };
type BreadcrumbItem = { name: string; href: string };

const BUSINESS_ID = `${siteUrl}#business`;

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HVACBusiness',
    '@id': BUSINESS_ID,
    name: SITE.businessName,
    legalName: SITE.legalName,
    url: siteUrl,
    telephone: BUSINESS.phoneHref.replace('tel:', ''),
    email: SITE.email,
    image: SITE.defaultOgImage,
    logo: `${siteUrl}/logo.png`,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.region,
      addressCountry: BUSINESS.address.country,
    },
    areaServed: ALL_SERVICE_AREAS.map((name) => ({ '@type': 'City', name: `${name}, NJ` })),
    serviceType: SITE.coreServices,
    sameAs: [SITE.social.facebook, SITE.social.instagram, SITE.social.google].filter(Boolean),
  };
}

export function buildServiceSchema(service: Pick<Service, 'slug' | 'name' | 'description'>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: service.name,
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'HVACBusiness',
      '@id': BUSINESS_ID,
      name: SITE.businessName,
      url: siteUrl,
      telephone: BUSINESS.phoneHref.replace('tel:', ''),
    },
    areaServed: ALL_SERVICE_AREAS.map((name) => ({ '@type': 'City', name: `${name}, NJ` })),
    url: getCanonical(`/services/${service.slug}`),
  };
}

export function buildServiceAreaSchema(city: { name: string; slug: string; county?: string }) {
  const geo = SERVICE_AREA_GEO[city.name];
  return {
    '@context': 'https://schema.org',
    '@type': 'HVACBusiness',
    '@id': `${getCanonical(`/service-areas/${city.slug}`)}#business`,
    name: `${SITE.businessName} — HVAC in ${city.name}, NJ`,
    parentOrganization: { '@id': BUSINESS_ID },
    url: getCanonical(`/service-areas/${city.slug}`),
    telephone: BUSINESS.phoneHref.replace('tel:', ''),
    image: SITE.defaultOgImage,
    priceRange: '$$',
    serviceType: SITE.coreServices,
    areaServed: {
      '@type': 'City',
      name: `${city.name}, NJ`,
      ...(geo
        ? {
            geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng },
            containedInPlace: {
              '@type': 'AdministrativeArea',
              name: city.county || geo.county,
            },
          }
        : {}),
    },
  };
}

export function buildFaqSchema(faqs: Faq[]) {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: getCanonical(item.href),
    })),
  };
}
