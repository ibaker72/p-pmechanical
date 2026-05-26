// Centralized SEO config + helpers. Single import surface for metadata,
// canonicals, and slug generation across every page. Values are sourced from
// lib/constants.ts so business data stays in one place.

import { BUSINESS, ALL_SERVICE_AREAS, SERVICES } from '@/lib/constants';

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url).replace(/\/$/, '');

export const SITE = {
  businessName: BUSINESS.name,
  legalName: BUSINESS.legalName,
  siteUrl,
  phone: BUSINESS.phone,
  phoneHref: BUSINESS.phoneHref,
  email: BUSINESS.email,
  baseCity: BUSINESS.address.city, // Clifton
  baseState: BUSINESS.address.region, // NJ
  serviceAreaCities: ALL_SERVICE_AREAS,
  coreServices: SERVICES.map((s) => s.name),
  defaultTitle: `${BUSINESS.name} — HVAC, Boiler, AC & Heating in ${BUSINESS.address.city}, NJ`,
  defaultDescription:
    `Fast, reliable HVAC service across ${BUSINESS.address.city} and North Jersey: AC repair & ` +
    `installation, heating and furnace repair, boilers, water heaters, ductwork, thermostats, ` +
    `and 24/7 emergency HVAC. Free estimates — call ${BUSINESS.phone}.`,
  defaultOgImage: `${siteUrl}/opengraph-image`,
  social: {
    facebook: BUSINESS.social.facebook,
    instagram: BUSINESS.social.instagram,
    google: BUSINESS.social.google,
  },
} as const;

const TITLE_SUFFIX = `${SITE.businessName}`;

/** Absolute canonical URL for a path. Pass "/" for the homepage. */
export function getCanonical(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = `/${path}`.replace(/\/{2,}/g, '/');
  return clean === '/' ? siteUrl : `${siteUrl}${clean.replace(/\/$/, '')}`;
}

/** Build a page <title>, appending the brand suffix unless already present. */
export function buildPageTitle(title?: string): string {
  if (!title || !title.trim()) return SITE.defaultTitle;
  const t = title.trim();
  if (t.toLowerCase().includes(SITE.businessName.toLowerCase())) return t;
  return `${t} | ${TITLE_SUFFIX}`;
}

/** Normalize a meta description: collapse whitespace, clamp to ~160 chars. */
export function buildMetaDescription(input?: string): string {
  const text = (input || SITE.defaultDescription).replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text;
  const clipped = text.slice(0, 157);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim()}…`;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** "Clifton", "NJ" -> "clifton-nj" */
export function buildServiceAreaSlug(city: string, state: string = SITE.baseState): string {
  return `${slugify(city)}-${slugify(state)}`;
}

/** "AC Repair" -> "ac-repair" */
export function buildServiceSlug(service: string): string {
  return slugify(service);
}
