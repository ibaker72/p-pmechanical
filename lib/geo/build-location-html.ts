// Deterministic HTML builder for AI-generated service-area pages.
//
// The model returns plain-text sections (see lib/geo/prompt.ts). This module
// assembles the body — headings, paragraphs, internal links. The FAQ block
// is intentionally NOT included in the HTML body anymore: the page renderer
// reads structured FAQ entries from faq_json and lays them out as React
// cards. Spacing around anchor tags is hardcoded so the output never
// produces "can<a" or "</a>today" issues.
//
// NOTE: deliberately has no @/ imports so the test harness can run under
// node --experimental-strip-types without a bundler. Business name is passed
// in via ctx (defaulting to "P&P Mechanical LLC").

import type { GeneratedSections } from './prompt';

export type FaqEntry = { question: string; answer: string };

export type BuildHtmlContext = {
  city: string;
  state: string;
  businessName?: string;
};

const DEFAULT_BUSINESS_NAME = 'P&P Mechanical LLC';

// Sites uses /services (residential), /commercial, /contact, /quote — verified
// against the existing navbar. Never reference /hvac-services here.
const LINK_SERVICES = '/services';
const LINK_COMMERCIAL = '/commercial';
const LINK_CONTACT = '/contact';
const LINK_QUOTE = '/quote';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function p(text: string): string {
  if (!text) return '';
  return `<p>${escapeHtml(text)}</p>`;
}

function h2(text: string): string {
  return `<h2>${escapeHtml(text)}</h2>`;
}

export function extractFaqs(sections: GeneratedSections): FaqEntry[] {
  const out: FaqEntry[] = [];
  for (const i of [1, 2, 3] as const) {
    const q = sections[`faq_${i}_question` as const];
    const a = sections[`faq_${i}_answer` as const];
    if (q && a) out.push({ question: q, answer: a });
  }
  return out;
}

/**
 * Remove any FAQ block that older builder output may have embedded in the
 * HTML body. Safe to call on freshly-built HTML (the new builder doesn't emit
 * a FAQ block, so this is a no-op there).
 */
export function stripFaqBlockFromHtml(html: string): string {
  return html
    .replace(
      /<h2>\s*Frequently Asked Questions\s*<\/h2>\s*<div class="faq-list">[\s\S]*?<\/div>\s*/i,
      '',
    )
    .replace(/<h2>\s*Frequently Asked Questions\s*<\/h2>\s*/i, '')
    .trim();
}

export function buildLocationPageHtml(
  sections: GeneratedSections,
  ctx: BuildHtmlContext,
): { html: string; faqs: FaqEntry[] } {
  const { city, state } = ctx;
  const businessName = ctx.businessName ?? DEFAULT_BUSINESS_NAME;
  const cityState = `${city}, ${state}`;

  const introBlock = p(sections.intro_paragraph);

  const servicesBlock = [
    h2(`HVAC Services in ${cityState}`),
    p(sections.services_paragraph),
    `<p>Need help now? <a href="${LINK_CONTACT}">Contact ${escapeHtml(businessName)}</a> to schedule service, or <a href="${LINK_QUOTE}">request a free quote</a> .</p>`,
  ].join('\n');

  const emergencyBlock = [
    h2(`Heating and Cooling Support for ${city} Homes and Businesses`),
    p(sections.emergency_paragraph),
  ].join('\n');

  const estimateBlock = [
    h2('Request an Estimate or Schedule Service'),
    p(sections.financing_or_estimate_paragraph),
    `<p>You can also <a href="${LINK_SERVICES}">view our HVAC services</a> or <a href="${LINK_COMMERCIAL}">explore commercial HVAC</a> to learn more.</p>`,
  ].join('\n');

  const whyBlock = [h2(`Why Choose ${businessName}?`), p(sections.why_choose_paragraph)].join('\n');

  const serviceAreaBlock = [
    h2(`Serving ${cityState} and Nearby Areas`),
    p(sections.service_area_paragraph),
  ].join('\n');

  // FAQ is intentionally omitted from the HTML body. The renderer reads
  // FAQ entries from the faq_json column and lays them out as styled cards.
  const faqs = extractFaqs(sections);

  const html = [
    introBlock,
    servicesBlock,
    emergencyBlock,
    estimateBlock,
    whyBlock,
    serviceAreaBlock,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { html, faqs };
}
