import { BUSINESS } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

// Organization schema — distinct from HVACBusiness/LocalBusiness. Helps AI
// answer engines (ChatGPT, Perplexity, Gemini, Claude) and Google Knowledge
// Panel resolve the business as an entity with logo, sameAs links, and a
// contact point.
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}#organization`,
  name: BUSINESS.name,
  legalName: BUSINESS.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-default.png`,
  foundingDate: String(BUSINESS.founded),
  email: BUSINESS.email,
  telephone: BUSINESS.phone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.address.street,
    addressLocality: BUSINESS.address.city,
    addressRegion: BUSINESS.address.region,
    postalCode: BUSINESS.address.postalCode,
    addressCountry: BUSINESS.address.country,
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: BUSINESS.phone,
      contactType: 'customer service',
      areaServed: 'US-NJ',
      availableLanguage: ['English', 'Spanish'],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
    },
  ],
  sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram, BUSINESS.social.google],
};

export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
    />
  );
}
