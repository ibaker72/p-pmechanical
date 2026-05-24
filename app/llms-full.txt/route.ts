import { NextResponse } from 'next/server';
import {
  BUSINESS,
  SERVICES,
  LOCATIONS,
  ALL_SERVICE_AREAS,
  GENERAL_FAQS,
  REVIEWS,
  AUTHORS,
} from '@/lib/constants';
import { getAllPosts } from '@/lib/blog';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

// Long-form variant of llms.txt — includes the full FAQ corpus, every service's
// process + included items + per-service FAQs, location intros, reviews, and
// blog excerpts. Designed to be ingested whole by an AI answer engine.
export function GET() {
  const posts = getAllPosts();
  const author = AUTHORS['pp-mechanical'];

  const body = `# ${BUSINESS.name} — Full Knowledge Base

Last updated: ${new Date().toISOString().slice(0, 10)}

## About
${BUSINESS.name} is an NJ-licensed HVAC, boiler, and AC contractor founded in ${BUSINESS.founded} and headquartered in ${BUSINESS.address.city}, ${BUSINESS.address.region}. We serve homeowners and small businesses across Passaic, Essex, and Bergen counties with installation, repair, and maintenance of heating, cooling, and boiler equipment. A real technician answers our 24/7 emergency line at any hour, every day of the year.

- Phone: ${BUSINESS.phone}
- Email: ${BUSINESS.email}
- Address: ${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.region} ${BUSINESS.address.postalCode}
- License: ${BUSINESS.license}
- Website: ${SITE_URL}

## Team & expertise
${author.name} — ${author.role}. ${author.yearsExperience}+ years of experience. Credentials: ${author.credentials.join('; ')}. Bio: ${author.bio}

## Services (detailed)

${SERVICES.map(
  (s) => `### ${s.name} (${s.segment})
URL: ${SITE_URL}${s.segment === 'commercial' ? '/commercial' : '/services'}/${s.slug}
Starting price: ${s.startingPrice ?? 'Custom quote'}

${s.description}

**What's included:**
${s.whatsIncluded.map((i) => `- ${i}`).join('\n')}

**Our process:**
${s.process.map((p, i) => `${i + 1}. **${p.title}** — ${p.description}`).join('\n')}

**FAQs for ${s.name}:**
${s.faqs.map((f) => `- Q: ${f.q}\n  A: ${f.a}`).join('\n')}
`,
).join('\n')}

## Service area (detailed)

We dispatch from Clifton, NJ. Primary coverage cities:

${LOCATIONS.map(
  (l) => `### ${l.name}, NJ (${l.county}, ${l.zip})
URL: ${SITE_URL}/locations/${l.slug}

${l.intro}

Housing context: ${l.housingNote}

Nearby cities we serve: ${l.nearby.join(', ')}
`,
).join('\n')}

Extended coverage (drive-time permitting): ${ALL_SERVICE_AREAS.join(', ')}.

## General FAQs

${GENERAL_FAQS.map((f) => `### ${f.q}\n_Category: ${f.category}_\n\n${f.a}`).join('\n\n')}

## Customer reviews

Average rating: 4.9 / 5 across 80+ reviews.

${REVIEWS.map((r) => `> "${r.text}" — **${r.author}**, ${r.city} (${r.date}, ${r.rating}★)`).join(
  '\n\n',
)}

## Guides & articles

${
  posts.length === 0
    ? '_(No posts published yet.)_'
    : posts
        .map(
          (p) =>
            `### ${p.title}
URL: ${SITE_URL}/blog/${p.slug}
Category: ${p.category} · Published: ${p.date} · ~${p.readingMinutes} min read

${p.excerpt}`,
        )
        .join('\n\n')
}

## Machine endpoints for autonomous agents
- Agent manifest: ${SITE_URL}/.well-known/agent.json
- Services + service-area JSON: ${SITE_URL}/api/services
- Lead submission webhook: ${SITE_URL}/api/leads/webhook (POST; optional Idempotency-Key and X-Webhook-Secret headers; HMAC-signed outbound event hook on success)
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
