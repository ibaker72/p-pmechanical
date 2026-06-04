// Expansion service-area cities — these are the ONLY cities the AI generator
// is allowed to target. Cities that already have hardcoded static pages in
// lib/constants.ts (LOCATIONS) are intentionally excluded so the AI system
// can never overwrite them.

import { LOCATIONS } from '@/lib/constants';
import { buildServiceAreaSlug } from '@/lib/seo/site';

export type ExpansionLocation = {
  city: string;
  state: string;
  slug: string;
  county?: string;
};

const RAW_EXPANSION: Array<{ city: string; state: string; county?: string }> = [
  { city: 'Little Falls', state: 'NJ', county: 'Passaic County' },
  { city: 'Woodland Park', state: 'NJ', county: 'Passaic County' },
  { city: 'Haledon', state: 'NJ', county: 'Passaic County' },
  { city: 'Hawthorne', state: 'NJ', county: 'Passaic County' },
  { city: 'Fair Lawn', state: 'NJ', county: 'Bergen County' },
  { city: 'Elmwood Park', state: 'NJ', county: 'Bergen County' },
  { city: 'Garfield', state: 'NJ', county: 'Bergen County' },
  { city: 'Lodi', state: 'NJ', county: 'Bergen County' },
  { city: 'Hackensack', state: 'NJ', county: 'Bergen County' },
  { city: 'Paramus', state: 'NJ', county: 'Bergen County' },
  { city: 'Totowa', state: 'NJ', county: 'Passaic County' },
  { city: 'Newark', state: 'NJ', county: 'Essex County' },
  { city: 'Jersey City', state: 'NJ', county: 'Hudson County' },
  { city: 'Hoboken', state: 'NJ', county: 'Hudson County' },
  { city: 'Secaucus', state: 'NJ', county: 'Hudson County' },
];

const STATIC_SLUGS = new Set(LOCATIONS.map((l) => l.slug));

export const EXPANSION_LOCATIONS: ExpansionLocation[] = RAW_EXPANSION.map(
  ({ city, state, county }) => ({
    city,
    state,
    county,
    slug: buildServiceAreaSlug(city, state),
  }),
).filter((l) => !STATIC_SLUGS.has(l.slug));

export function isStaticLocationSlug(slug: string): boolean {
  return STATIC_SLUGS.has(slug);
}

export function findExpansionLocation(slug: string): ExpansionLocation | null {
  return EXPANSION_LOCATIONS.find((l) => l.slug === slug) ?? null;
}
