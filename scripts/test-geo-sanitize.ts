#!/usr/bin/env tsx
// Local sanitizer + HTML-builder test harness.
//
// Run with:
//   npx tsx scripts/test-geo-sanitize.ts
//
// Exits 0 if all tests pass, 1 otherwise. Uses the same tsx runner as the
// project's other dev scripts so the @/* path alias resolves.

import {
  normalizeCity,
  normalizeState,
  applyKnownBadMerges,
  canonicalizeProperNouns,
  sanitizeSection,
  detectSuspiciousMerges,
  stripStrayMarkup,
  normalizeTextSpacing,
  enforceAnchorTagSpacing,
} from '@/lib/geo/sanitize';
import { buildLocationPageHtml } from '@/lib/geo/build-location-html';
import type { GeneratedSections } from '@/lib/geo/prompt';

type TestCase = { name: string; run: () => boolean | string };

const tests: TestCase[] = [
  // ---- City normalization ----
  {
    name: 'normalizeCity: lowercased city -> Title Case',
    run: () => normalizeCity('newark') === 'Newark',
  },
  { name: 'normalizeCity: passaic -> Passaic', run: () => normalizeCity('passaic') === 'Passaic' },
  {
    name: 'normalizeCity: jersey city -> Jersey City',
    run: () => normalizeCity('jersey city') === 'Jersey City',
  },
  {
    name: 'normalizeCity: fair lawn -> Fair Lawn',
    run: () => normalizeCity('fair lawn') === 'Fair Lawn',
  },
  {
    name: 'normalizeCity: already-cased -> unchanged',
    run: () => normalizeCity('Hackensack') === 'Hackensack',
  },

  // ---- State normalization ----
  { name: 'normalizeState: nj -> NJ', run: () => normalizeState('nj') === 'NJ' },
  { name: 'normalizeState: NJ -> NJ', run: () => normalizeState('NJ') === 'NJ' },

  // ---- Known bad merges ----
  {
    name: 'applyKnownBadMerges: HVACservice -> HVAC service',
    run: () => applyKnownBadMerges('HVACservice in town').includes('HVAC service'),
  },
  {
    name: 'applyKnownBadMerges: ACrepair -> AC repair',
    run: () => applyKnownBadMerges('Need ACrepair fast').includes('AC repair'),
  },
  {
    name: 'applyKnownBadMerges: heatingrepair -> heating repair',
    run: () => applyKnownBadMerges('heatingrepair available').includes('heating repair'),
  },
  {
    name: 'applyKnownBadMerges: boilerrepair -> boiler repair',
    run: () => applyKnownBadMerges('boilerrepair pricing').includes('boiler repair'),
  },
  {
    name: 'applyKnownBadMerges: mini splitinstallation -> mini split installation',
    run: () =>
      applyKnownBadMerges('mini splitinstallation today').includes('mini split installation'),
  },
  {
    name: 'applyKnownBadMerges: servicearea -> service area',
    run: () => applyKnownBadMerges('our servicearea covers').includes('service area'),
  },
  {
    name: 'applyKnownBadMerges: NorthJersey -> North Jersey',
    run: () => applyKnownBadMerges('throughout NorthJersey today').includes('North Jersey'),
  },
  {
    name: 'applyKnownBadMerges: PatersonNJ -> Paterson NJ',
    run: () => applyKnownBadMerges('serving PatersonNJ').includes('Paterson NJ'),
  },
  {
    name: 'applyKnownBadMerges: contactus -> contact us',
    run: () => applyKnownBadMerges('contactus to book').includes('contact us'),
  },
  {
    name: 'applyKnownBadMerges: schedulean -> schedule an',
    run: () => applyKnownBadMerges('schedulean estimate').includes('schedule an'),
  },
  {
    name: 'applyKnownBadMerges: homesand -> homes and',
    run: () => applyKnownBadMerges('homesand businesses').includes('homes and'),
  },
  {
    name: 'applyKnownBadMerges: businessesin -> businesses in',
    run: () => applyKnownBadMerges('businessesin Newark').includes('businesses in'),
  },
  {
    name: 'applyKnownBadMerges: emergencyservice -> emergency service',
    run: () => applyKnownBadMerges('24/7 emergencyservice').includes('emergency service'),
  },

  // ---- Tokens that must NOT be changed ----
  {
    name: 'preserve 24/7 token',
    run: () => sanitizeSection('Open 24/7 for service').includes('24/7'),
  },
  {
    name: 'preserve HVAC casing',
    run: () => sanitizeSection('hvac and HVAC').includes('HVAC and HVAC'),
  },
  {
    name: 'preserve AC casing',
    run: () => sanitizeSection('ac repair').includes('AC repair'),
  },
  {
    name: 'preserve NJ casing',
    run: () => sanitizeSection('serving Clifton nj').includes('Clifton NJ'),
  },

  // ---- Brand name canonicalization ----
  {
    name: 'canonicalizeProperNouns: PP Mechanical -> P&P Mechanical LLC',
    run: () => canonicalizeProperNouns('PP Mechanical LLC') === 'P&P Mechanical LLC',
  },
  {
    name: 'canonicalizeProperNouns: P & P Mechanical -> P&P Mechanical LLC',
    run: () => canonicalizeProperNouns('P & P Mechanical') === 'P&P Mechanical LLC',
  },
  {
    name: 'canonicalizeProperNouns: P&P Mechanical LLC stays intact',
    run: () => canonicalizeProperNouns('P&P Mechanical LLC') === 'P&P Mechanical LLC',
  },

  // ---- Markdown / HTML stripping ----
  {
    name: 'stripStrayMarkup: removes <strong>',
    run: () => !stripStrayMarkup('this is <strong>bold</strong> text').includes('<'),
  },
  {
    name: 'stripStrayMarkup: removes **bold** markdown',
    run: () => stripStrayMarkup('a **bold** word').includes('a bold word'),
  },

  // ---- Whitespace + spacing ----
  {
    name: 'normalizeTextSpacing: collapses double spaces',
    run: () => normalizeTextSpacing('hello    world') === 'hello world',
  },
  {
    name: 'normalizeTextSpacing: adds space after period',
    run: () => normalizeTextSpacing('done.Next sentence').includes('done. Next'),
  },
  {
    name: 'enforceAnchorTagSpacing: spaces around anchor',
    run: () => {
      const out = enforceAnchorTagSpacing('book<a href="/x">now</a>today');
      return out.includes(' <a') && out.includes('</a> ');
    },
  },

  // ---- Suspicious merge detection (positives) ----
  {
    name: 'detectSuspiciousMerges: catches HVACtechnician',
    run: () => detectSuspiciousMerges('the HVACtechnician arrived').length > 0,
  },

  // ---- False positives (must NOT warn) ----
  ...[
    'mechanical',
    'commercial',
    'residential',
    'emergency',
    'service',
    'maintenance',
    'installation',
    'conditioning',
    'refrigeration',
  ].map((w) => ({
    name: `detectSuspiciousMerges: no warning on "${w}"`,
    run: () => detectSuspiciousMerges(`The ${w} team is ready.`).length === 0,
  })),

  // ---- HTML builder ----
  {
    name: 'buildLocationPageHtml: contains H2 sections',
    run: () => {
      const { html } = buildLocationPageHtml(sampleSections(), { city: 'Fair Lawn', state: 'NJ' });
      return (
        html.includes('<h2>HVAC Services in Fair Lawn, NJ</h2>') &&
        html.includes('<h2>Why Choose P&amp;P Mechanical LLC?</h2>')
      );
    },
  },
  {
    name: 'buildLocationPageHtml: includes internal links to /services and /contact',
    run: () => {
      const { html } = buildLocationPageHtml(sampleSections(), { city: 'Fair Lawn', state: 'NJ' });
      return html.includes('href="/services"') && html.includes('href="/contact"');
    },
  },
  {
    name: 'buildLocationPageHtml: anchors have surrounding spaces',
    run: () => {
      const { html } = buildLocationPageHtml(sampleSections(), { city: 'Fair Lawn', state: 'NJ' });
      // No "word<a" patterns and no "</a>word" patterns.
      return !/[A-Za-z0-9]<a\s/.test(html) && !/<\/a>[A-Za-z0-9]/.test(html);
    },
  },
  {
    name: 'buildLocationPageHtml: returns 3 faqs from sample',
    run: () => {
      const { faqs } = buildLocationPageHtml(sampleSections(), { city: 'Fair Lawn', state: 'NJ' });
      return faqs.length === 3;
    },
  },
];

function sampleSections(): GeneratedSections {
  return {
    meta_title: 'HVAC in Fair Lawn, NJ | P&P Mechanical LLC',
    meta_description: 'AC, heating, and boiler service in Fair Lawn, NJ from P&P Mechanical LLC.',
    h1_heading: 'HVAC Services in Fair Lawn, NJ',
    intro_paragraph: 'Local HVAC contractor serving Fair Lawn homes and businesses.',
    services_paragraph:
      'We handle AC repair, heating repair, boiler service, and mini split installation across Fair Lawn.',
    emergency_paragraph:
      'Contact the team to ask about emergency availability and same-day scheduling.',
    financing_or_estimate_paragraph:
      'Request a free estimate or schedule service whenever it works for you.',
    why_choose_paragraph: 'Local knowledge, clean work, and clear communication.',
    service_area_paragraph:
      'We also serve Paramus, Hackensack, Garfield, and the surrounding North Jersey towns.',
    faq_1_question: 'Do you service Fair Lawn?',
    faq_1_answer: 'Yes — we cover all of Fair Lawn and the surrounding area.',
    faq_2_question: 'Do you handle both residential and commercial?',
    faq_2_answer: 'Yes, we serve homes and businesses across North Jersey.',
    faq_3_question: 'How do I request an estimate?',
    faq_3_answer: 'Use the contact form or call the office to schedule.',
  };
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

for (const t of tests) {
  let result: boolean | string = false;
  try {
    result = t.run();
  } catch (e) {
    result = e instanceof Error ? e.message : 'threw';
  }
  if (result === true) {
    passed++;
  } else {
    failed++;
    failures.push(`  ✗ ${t.name}${typeof result === 'string' ? ` — ${result}` : ''}`);
  }
}

console.log(`\nGeo sanitizer tests: ${passed} passed, ${failed} failed (of ${tests.length})\n`);
if (failures.length) {
  console.log('Failures:');
  for (const f of failures) console.log(f);
  process.exit(1);
}
process.exit(0);
