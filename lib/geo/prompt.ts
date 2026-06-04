// Anthropic system prompt + tool schema for generating local HVAC SEO pages.
//
// The model is forced into a single tool call (generate_hvac_service_area_page)
// and returns plain-text sections only. No HTML, no markdown, no anchors —
// the TypeScript HTML builder owns the final structure.

import { BUSINESS, RESIDENTIAL_SERVICES, COMMERCIAL_SERVICES } from '@/lib/constants';
import type { AnthropicTool } from '@/lib/anthropic/client';

export type GeneratedSections = {
  meta_title: string;
  meta_description: string;
  h1_heading: string;
  intro_paragraph: string;
  services_paragraph: string;
  emergency_paragraph: string;
  financing_or_estimate_paragraph: string;
  why_choose_paragraph: string;
  service_area_paragraph: string;
  faq_1_question: string;
  faq_1_answer: string;
  faq_2_question: string;
  faq_2_answer: string;
  faq_3_question: string;
  faq_3_answer: string;
};

export const SERVICE_AREA_TOOL_NAME = 'generate_hvac_service_area_page';

const requiredText = (description: string) => ({
  type: 'string',
  description,
});

export const serviceAreaTool: AnthropicTool = {
  name: SERVICE_AREA_TOOL_NAME,
  description:
    'Return clean, plain-text sections for a local HVAC service-area landing page. Do not include HTML, markdown, or anchor tags. Each section should be cohesive prose, written for the city specified by the user.',
  input_schema: {
    type: 'object',
    properties: {
      meta_title: requiredText(
        'SEO <title> tag, 50–60 characters. Should include the city and service intent (e.g. HVAC, AC, heating).',
      ),
      meta_description: requiredText(
        'SEO <meta> description, 140–158 characters. Local, specific, no clickbait, no fake claims.',
      ),
      h1_heading: requiredText('Main H1 for the page (plain text). Should include the city name.'),
      intro_paragraph: requiredText(
        '2–4 sentence intro establishing P&P Mechanical LLC as a local HVAC contractor serving this city. Mention residential and commercial work in general terms.',
      ),
      services_paragraph: requiredText(
        'A paragraph (3–5 sentences) describing the HVAC services available in this city: AC repair and installation, heating and furnace repair, boiler service, mini split installation, maintenance, and indoor air quality. Reference homes and businesses generally — no fake stats.',
      ),
      emergency_paragraph: requiredText(
        'A paragraph (2–3 sentences) about response availability. Use safe phrasing: "ask about emergency availability", "schedule service", "contact the team". Do NOT promise 24/7 response unless asked. Do not invent ETAs.',
      ),
      financing_or_estimate_paragraph: requiredText(
        'A paragraph (2–3 sentences) inviting the reader to request an estimate or schedule service. Reference free estimates and clear pricing in general terms. Do not invent specific dollar amounts.',
      ),
      why_choose_paragraph: requiredText(
        'A paragraph (3–4 sentences) on why someone in this city would choose P&P Mechanical LLC. Reference local knowledge, residential and commercial experience, clear communication, and proper installation practices. No fake review counts, no fake awards.',
      ),
      service_area_paragraph: requiredText(
        'A paragraph (2–3 sentences) noting that P&P also serves neighboring towns and the broader North Jersey region. Mention the city by name once more.',
      ),
      faq_1_question: requiredText('A natural FAQ question about HVAC service in this city.'),
      faq_1_answer: requiredText('A 2–3 sentence answer. Plain text only, no markup.'),
      faq_2_question: requiredText(
        'A second FAQ question — focused on a different topic (e.g. AC vs heating, repair vs replace, scheduling).',
      ),
      faq_2_answer: requiredText('A 2–3 sentence answer. Plain text only, no markup.'),
      faq_3_question: requiredText(
        'A third FAQ question (e.g. emergency availability, free estimates, financing).',
      ),
      faq_3_answer: requiredText('A 2–3 sentence answer. Plain text only, no markup.'),
    },
    required: [
      'meta_title',
      'meta_description',
      'h1_heading',
      'intro_paragraph',
      'services_paragraph',
      'emergency_paragraph',
      'financing_or_estimate_paragraph',
      'why_choose_paragraph',
      'service_area_paragraph',
      'faq_1_question',
      'faq_1_answer',
      'faq_2_question',
      'faq_2_answer',
      'faq_3_question',
      'faq_3_answer',
    ],
  },
};

function buildBusinessContext(): string {
  const residential = RESIDENTIAL_SERVICES.map((s) => `- ${s.name}: ${s.short}`).join('\n');
  const commercial = COMMERCIAL_SERVICES.map((s) => `- ${s.name}: ${s.short}`).join('\n');
  return [
    `Business name (exact): ${BUSINESS.name}`,
    `Phone: ${BUSINESS.phone}`,
    `Email: ${BUSINESS.email}`,
    `Home base: ${BUSINESS.address.city}, ${BUSINESS.address.region}`,
    `Service area: ${BUSINESS.serviceArea}`,
    `Founded: ${BUSINESS.founded}`,
    `License posture: ${BUSINESS.license}`,
    '',
    'Residential services offered:',
    residential,
    '',
    'Commercial services offered:',
    commercial,
  ].join('\n');
}

export function buildSystemPrompt(): string {
  return [
    `You are an SEO copywriter for ${BUSINESS.name}, a licensed HVAC, boiler, and AC contractor in North Jersey. You write clean, locally-targeted landing-page copy for service-area pages.`,
    '',
    'CRITICAL RULES:',
    '- Output ONLY via the generate_hvac_service_area_page tool. Never write a freeform reply.',
    '- Every field must be plain text. No HTML tags, no <a> anchors, no markdown, no asterisks, no backticks, no headings (#).',
    '- Do NOT invent licenses, certifications, year counts, review counts, ratings, awards, dollar amounts, or response-time SLAs. The business IS Licensed & Insured in NJ — that exact phrase is safe. Do not invent other credentials.',
    '- Do NOT promise 24/7 dispatch unless the user explicitly asks for it.',
    '- Use the EXACT business name with the ampersand: "P&P Mechanical LLC". Not "PP Mechanical".',
    '- Use "HVAC", "AC", and "NJ" (capitalized exactly).',
    '- Avoid spammy SEO patterns: no keyword stuffing, no "best HVAC company in [city]" superlatives unless framed as opinion, no fake guarantees.',
    '- Vary the structure city to city — do not produce templates that read identically for every city.',
    '- Keep sentences readable. Aim for varied sentence length.',
    '',
    'SPACING + TOKEN RULES (very important):',
    '- Always put a single space between two words. Never glue words together. Wrong: "FairLawn", "ofHVAC", "ora", "P&PMechanical", "ChooseP&P", "areaand", "orsend". Right: "Fair Lawn", "of HVAC", "or a", "P&P Mechanical", "Choose P&P", "area and", "or send".',
    '- Always put a single space after every period, comma, colon, and semicolon. Wrong: "option.Contact", "homeowners,landlords", "Fair Lawn.On". Right: "option. Contact", "homeowners, landlords", "Fair Lawn. On".',
    '- Write email addresses as one unbroken token. Wrong: "service@ppmechanicalhvac. com". Right: "service@ppmechanicalhvac.com".',
    '- Multi-word city names always have a space inside: "Fair Lawn", "Jersey City", "East Orange", "Little Falls", "Woodland Park", "Elmwood Park".',
    '- North Jersey is two words.',
    '',
    'BUSINESS CONTEXT:',
    buildBusinessContext(),
    '',
    'TONE: Direct, knowledgeable, locally rooted. The voice of a small-business owner-operator who has actually worked in these neighborhoods, not a marketing agency.',
  ].join('\n');
}

export function buildUserPrompt(city: string, state: string): string {
  return [
    `Generate the landing-page copy for the city: ${city}, ${state}.`,
    '',
    'Targeted search intents include:',
    `- HVAC contractor in ${city} ${state}`,
    `- AC repair in ${city} ${state}`,
    `- heating repair in ${city} ${state}`,
    `- furnace repair in ${city} ${state}`,
    `- boiler service in ${city} ${state}`,
    `- mini split installation in ${city} ${state}`,
    `- residential and commercial HVAC near ${city}`,
    '',
    'Write each section as cohesive prose. Mention the city by name in at least the H1, intro, services, and service-area paragraphs (but do not stuff the name).',
    'Now call the generate_hvac_service_area_page tool with all 15 fields filled in.',
  ].join('\n');
}
