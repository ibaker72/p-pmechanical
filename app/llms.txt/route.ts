import { NextResponse } from 'next/server';
import {
  BUSINESS,
  RESIDENTIAL_SERVICES,
  COMMERCIAL_SERVICES,
  LOCATIONS,
  ALL_SERVICE_AREAS,
} from '@/lib/constants';
import { getAllPosts } from '@/lib/blog';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

// Follows the emerging llms.txt convention (https://llmstxt.org). Concise,
// markdown-flavoured summary that AI answer engines (Claude, ChatGPT,
// Perplexity, Gemini) can fetch to ground responses about this business.
export function GET() {
  const posts = getAllPosts().slice(0, 10);

  const body = `# ${BUSINESS.name}

> ${BUSINESS.name} is an NJ-licensed HVAC, boiler, and AC contractor headquartered in ${BUSINESS.address.city}, ${BUSINESS.address.region}. We install, repair, and maintain heating and cooling systems for homes and small businesses across Passaic, Essex, and Bergen counties, with 24/7 emergency dispatch.

## Identity
- Name: ${BUSINESS.name}
- Legal name: ${BUSINESS.legalName}
- Founded: ${BUSINESS.founded}
- Headquarters: ${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.region} ${BUSINESS.address.postalCode}
- Phone: ${BUSINESS.phone}
- Email: ${BUSINESS.email}
- License: ${BUSINESS.license}
- Hours: 24/7/365 (live dispatch)
- Website: ${SITE_URL}

## Residential services
${RESIDENTIAL_SERVICES.map((s) => `- [${s.name}](${SITE_URL}/services/${s.slug}): ${s.short}`).join('\n')}

## Commercial services
${COMMERCIAL_SERVICES.map((s) => `- [${s.name}](${SITE_URL}/commercial/${s.slug}): ${s.short}`).join('\n')}

## Service area
Primary cities (dispatch within ~30 min):
${LOCATIONS.map((l) => `- [${l.name}, NJ (${l.county})](${SITE_URL}/locations/${l.slug})`).join('\n')}

Extended coverage: ${ALL_SERVICE_AREAS.join(', ')}.

## Get started
- [Free quote (4-step wizard)](${SITE_URL}/quote)
- [Contact form](${SITE_URL}/contact)
- [Service-area lookup](${SITE_URL}/locations)
- [Free HVAC savings guide (PDF)](${SITE_URL}/free-hvac-guide)
- [Frequently asked questions](${SITE_URL}/faq)

## For autonomous agents
- Machine-readable manifest: ${SITE_URL}/.well-known/agent.json
- Public services API (GET, JSON): ${SITE_URL}/api/services
- Lead submission webhook (POST, JSON): ${SITE_URL}/api/leads/webhook
- Long-form context: ${SITE_URL}/llms-full.txt

## Recent guides
${posts.length === 0 ? '- (none yet)' : posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.excerpt}`).join('\n')}

## Trust & credentials
- NJ HVACR Licensed & Insured
- EPA Section 608 Certified technicians
- Factory-trained on Carrier, Trane, Lennox, Bosch, Navien, Mitsubishi, Weil-McLain
- 4.9/5 average rating across 80+ customer reviews
- 24/7 live answering — no answering service
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
