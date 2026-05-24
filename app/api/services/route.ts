import { NextResponse } from 'next/server';
import {
  BUSINESS,
  SERVICES,
  ALL_SERVICE_AREAS,
  LOCATIONS,
  SERVICE_AREA_GEO,
} from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

// Public JSON describing what this business does and where. Lets agents
// (OpenClaw, ChatGPT, custom RAG pipelines) answer service/area questions
// without scraping HTML.
export function GET() {
  return NextResponse.json(
    {
      business: {
        name: BUSINESS.name,
        phone: BUSINESS.phone,
        email: BUSINESS.email,
        address: BUSINESS.address,
        url: SITE_URL,
        license: BUSINESS.license,
        hours: '24/7/365',
      },
      services: SERVICES.map((s) => ({
        slug: s.slug,
        name: s.name,
        segment: s.segment,
        short: s.short,
        description: s.description,
        starting_price: s.startingPrice ?? null,
        included: s.whatsIncluded,
        process: s.process,
        faqs: s.faqs,
        url: `${SITE_URL}${s.segment === 'commercial' ? '/commercial' : '/services'}/${s.slug}`,
      })),
      service_areas: ALL_SERVICE_AREAS.map((city) => ({
        city,
        ...(SERVICE_AREA_GEO[city] ?? {}),
        url: LOCATIONS.find((l) => l.name === city)
          ? `${SITE_URL}/locations/${LOCATIONS.find((l) => l.name === city)!.slug}`
          : null,
      })),
      locations: LOCATIONS.map((l) => ({
        slug: l.slug,
        name: l.name,
        county: l.county,
        zip: l.zip,
        intro: l.intro,
        housing_note: l.housingNote,
        nearby: l.nearby,
        geo: SERVICE_AREA_GEO[l.name] ?? null,
        url: `${SITE_URL}/locations/${l.slug}`,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
