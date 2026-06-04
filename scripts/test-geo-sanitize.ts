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

  // ---- Production-observed merges (Fair Lawn dry_run) ----
  {
    name: 'sanitize: FairLawn -> Fair Lawn',
    run: () => sanitizeSection('serving FairLawn homes').includes('Fair Lawn'),
  },
  {
    name: 'sanitize: P&PMechanical -> P&P Mechanical LLC',
    run: () => sanitizeSection('call P&PMechanical today').includes('P&P Mechanical LLC'),
  },
  {
    name: 'sanitize: cascading ChooseP&PMechanical -> Choose P&P Mechanical LLC',
    run: () =>
      sanitizeSection('Why ChooseP&PMechanical?').includes('Why Choose P&P Mechanical LLC?'),
  },
  {
    name: 'sanitize: summer ora -> summer or a',
    run: () => sanitizeSection('summer ora cool fall').includes('summer or a cool fall'),
  },
  {
    name: 'sanitize: range ofHVAC -> range of HVAC',
    run: () => sanitizeSection('range ofHVAC services').includes('range of HVAC services'),
  },
  {
    name: 'sanitize: option.Contact -> option. Contact',
    run: () => sanitizeSection('the best option.Contact us today').includes('option. Contact'),
  },
  {
    name: 'sanitize: email rejoin (service@ppmechanicalhvac. com)',
    run: () =>
      sanitizeSection('Email service@ppmechanicalhvac. com today').includes(
        'service@ppmechanicalhvac.com',
      ),
  },
  {
    name: 'sanitize: Why ChooseP&P -> Why Choose P&P',
    run: () => sanitizeSection('Why ChooseP&P Mechanical LLC?').includes('Why Choose P&P'),
  },
  {
    name: 'sanitize: modernmulti-zone -> modern multi-zone',
    run: () => sanitizeSection('a modernmulti-zone install').includes('modern multi-zone'),
  },
  {
    name: 'sanitize: areaand -> area and',
    run: () => sanitizeSection('service areaand neighboring towns').includes('area and'),
  },
  {
    name: 'sanitize: homeowners,landlords -> homeowners, landlords',
    run: () =>
      sanitizeSection('homeowners,landlords, and managers').includes('homeowners, landlords'),
  },
  {
    name: 'sanitize: Fair Lawn.On -> Fair Lawn. On',
    run: () =>
      sanitizeSection('We serve Fair Lawn.On weekends we book ahead.').includes('Fair Lawn. On'),
  },
  {
    name: 'sanitize: maintenancecontracts -> maintenance contracts',
    run: () =>
      sanitizeSection('We offer maintenancecontracts for landlords').includes(
        'maintenance contracts',
      ),
  },
  {
    name: 'sanitize: includingthose -> including those',
    run: () =>
      sanitizeSection('homes includingthose with old radiators').includes('including those'),
  },
  {
    name: 'sanitize: orsend -> or send',
    run: () => sanitizeSection('Call now orsend a message.').includes('or send'),
  },
  {
    name: 'sanitize: heating orcooling -> heating or cooling',
    run: () => sanitizeSection('heating orcooling work').includes('heating or cooling'),
  },

  // ---- Generic stop-word + capital merge ----
  {
    name: 'sanitize: ofMitsubishi -> of Mitsubishi',
    run: () => sanitizeSection('factory-trained ofMitsubishi units').includes('of Mitsubishi'),
  },
  {
    name: 'sanitize: andTrane -> and Trane',
    run: () => sanitizeSection('Carrier andTrane equipment').includes('and Trane'),
  },
  {
    name: 'sanitize: must NOT split "orange" or "another"',
    run: () => {
      const a = sanitizeSection('the orange unit');
      const b = sanitizeSection('another visit');
      return a.includes('orange') && b.includes('another') && !a.includes('or ange');
    },
  },

  // ---- Proper noun anchors ----
  {
    name: 'sanitize: north jersey -> North Jersey',
    run: () => sanitizeSection('across north jersey today').includes('North Jersey'),
  },
  {
    name: 'sanitize: new jersey -> New Jersey',
    run: () => sanitizeSection('throughout new jersey').includes('New Jersey'),
  },

  // ---- Suspicious-merge warnings on survivors ----
  {
    name: 'detectSuspiciousMerges: catches FairLawn survivor',
    run: () =>
      detectSuspiciousMerges('serving FairLawn customers').some(
        (m) => m.token.includes('glued_proper_noun') || m.token === 'FairLawn',
      ),
  },
  {
    name: 'detectSuspiciousMerges: catches broken email survivor',
    run: () =>
      detectSuspiciousMerges('email service@example. com today').some((m) =>
        m.token.includes('broken_email'),
      ),
  },
  {
    name: 'detectSuspiciousMerges: catches punctuation-no-space survivor',
    run: () =>
      detectSuspiciousMerges('done.Next sentence').some((m) =>
        m.token.includes('punctuation_no_space'),
      ),
  },
  // ---- Second-batch production survivors (Fair Lawn saved row) ----
  {
    name: 'sanitize: Contractorin -> Contractor in',
    run: () => sanitizeSection('HVAC Contractorin Fair Lawn').includes('Contractor in'),
  },
  {
    name: 'sanitize: afull -> a full',
    run: () => sanitizeSection('for afull range').includes('a full'),
  },
  {
    name: 'sanitize: notpractical -> not practical',
    run: () => sanitizeSection('is notpractical for these homes').includes('not practical'),
  },
  {
    name: 'sanitize: steamsystems -> steam systems',
    run: () => sanitizeSection('older steamsystems still operating').includes('steam systems'),
  },
  {
    name: 'sanitize: aspossible -> as possible',
    run: () => sanitizeSection('as soon aspossible').includes('as possible'),
  },
  {
    name: 'sanitize: Inaddition -> In addition',
    run: () => sanitizeSection('Inaddition to repair work').includes('In addition'),
  },
  {
    name: 'sanitize: Jerseytowns -> Jersey towns',
    run: () => sanitizeSection('North Jerseytowns including Fair Lawn').includes('Jersey towns'),
  },
  {
    name: 'sanitize: acall -> a call',
    run: () => sanitizeSection('give us acall today').includes('a call'),
  },
  {
    name: 'sanitize: Ourgoal -> Our goal',
    run: () => sanitizeSection('Ourgoal is to make HVAC simple').includes('Our goal'),
  },
  {
    name: 'sanitize: thebroader -> the broader',
    run: () => sanitizeSection('serving thebroader region').includes('the broader'),
  },
  {
    name: 'sanitize: freeestimate -> free estimate',
    run: () => sanitizeSection('request a freeestimate online').includes('free estimate'),
  },
  {
    name: 'sanitize: istoo -> is too',
    run: () => sanitizeSection('no job istoo small').includes('is too'),
  },
  {
    name: 'sanitize: candesign -> can design',
    run: () => sanitizeSection('our team candesign a system').includes('can design'),
  },
  {
    name: 'sanitize: installationsand -> installations and',
    run: () => sanitizeSection('do installationsand repairs').includes('installations and'),
  },
  {
    name: 'sanitize: schedulingas -> scheduling as',
    run: () => sanitizeSection('flexible schedulingas needed').includes('scheduling as'),
  },
  {
    name: 'sanitize: minisplit (no s) -> mini split',
    run: () => sanitizeSection('minisplit install').includes('mini split'),
  },
  {
    name: 'sanitize: minisplits -> mini splits',
    run: () => sanitizeSection('we install minisplits').includes('mini splits'),
  },

  // ---- Em-dash spacing ----
  {
    name: 'sanitize: price— it -> price — it (add leading space)',
    run: () => sanitizeSection('a fair price— it pays for itself').includes('price — it'),
  },
  {
    name: 'sanitize: fast—same -> fast — same (both sides)',
    run: () => sanitizeSection('fast—same day').includes('fast — same'),
  },
  {
    name: 'sanitize: keeps existing " — " unchanged',
    run: () => sanitizeSection('clean — pricing — clear').includes(' — '),
  },

  // ---- Comma + digit boundary ----
  {
    name: 'sanitize: 1,000 stays 1,000 (no false split)',
    run: () => sanitizeSection('over 1,000 homes').includes('1,000'),
  },

  // ---- Warning patterns ----
  {
    name: 'detectSuspiciousMerges: catches comma_no_space survivor',
    run: () =>
      detectSuspiciousMerges('heat wave,waiting').some((m) => m.token.includes('comma_no_space')),
  },
  {
    name: 'detectSuspiciousMerges: catches em_dash_no_space survivor',
    run: () =>
      detectSuspiciousMerges('price— it').some((m) => m.token.includes('em_dash_no_space')),
  },
  {
    name: 'detectSuspiciousMerges: catches known_glue_survivor (freeestimate)',
    run: () =>
      detectSuspiciousMerges('a freeestimate online').some((m) =>
        m.token.includes('known_glue_survivor'),
      ),
  },
  {
    name: 'detectSuspiciousMerges: catches known_glue_survivor (Ourgoal)',
    run: () =>
      detectSuspiciousMerges('Ourgoal is X').some((m) => m.token.includes('known_glue_survivor')),
  },
  {
    name: 'detectSuspiciousMerges: catches camel_case_merge (chooseP&P)',
    run: () =>
      detectSuspiciousMerges('Why chooseP&P').some((m) => m.token.includes('camel_case_merge')),
  },

  // ---- False positives: real English words should NOT warn ----
  ...[
    'another',
    'anomaly',
    'orange',
    'organic',
    'office',
    'often',
    'notice',
    'notable',
    'theatre',
    'theme',
    'isolate',
    'aspect',
    'assemble',
    'industry',
    'include',
    'oranges',
    'inside',
  ].map((w) => ({
    name: `sanitize: real word "${w}" survives intact`,
    run: () => {
      const out = sanitizeSection(`The ${w} is fine.`);
      return out.includes(w);
    },
  })),

  {
    name: 'detectSuspiciousMerges: no false positive on clean text',
    run: () =>
      detectSuspiciousMerges(
        'We serve Fair Lawn, NJ — call P&P Mechanical LLC at service@ppmechanicalhvac.com.',
      ).length === 0,
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
