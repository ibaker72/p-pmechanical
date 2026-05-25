const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ppmechanicalhvac.com';

const HVAC_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HVACBusiness',
  '@id': `${SITE_URL}#business`,
  name: 'P&P Mechanical LLC',
  url: SITE_URL,
  telephone: '+12014565151',
  email: 'sales@ppmechanicalhvac.com',
  image: `${SITE_URL}/opengraph-image`,
  logo: `${SITE_URL}/logo.png`,
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Clifton',
    addressRegion: 'NJ',
    addressCountry: 'US',
  },
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Passaic County, NJ' },
    { '@type': 'AdministrativeArea', name: 'Essex County, NJ' },
    { '@type': 'AdministrativeArea', name: 'Bergen County, NJ' },
    { '@type': 'City', name: 'Clifton, NJ' },
    { '@type': 'City', name: 'Passaic, NJ' },
    { '@type': 'City', name: 'Paterson, NJ' },
    { '@type': 'City', name: 'Wayne, NJ' },
    { '@type': 'City', name: 'Bloomfield, NJ' },
    { '@type': 'City', name: 'Montclair, NJ' },
    { '@type': 'City', name: 'Nutley, NJ' },
    { '@type': 'City', name: 'East Orange, NJ' },
  ],
  knowsAbout: [
    'HVAC Installation',
    'Boiler Installation',
    'Air Conditioning Repair',
    'Furnace Maintenance',
    'Manual J Load Calculation',
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '80',
    bestRating: '5',
    worstRating: '1',
  },
};

export function HvacBusinessSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(HVAC_BUSINESS_SCHEMA),
      }}
    />
  );
}
