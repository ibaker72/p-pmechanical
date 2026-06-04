// Sanitizer / normalizer for AI-generated SEO copy.
//
// The model returns plain-text sections only — never HTML, never markdown,
// never anchor tags. Even so, models occasionally produce merged tokens
// ("HVACservice", "ACrepair"), inconsistent casing ("newark"), or stray
// punctuation. This module fixes those deterministically before the HTML
// builder runs.
//
// Rules of thumb:
//   - Keep "HVAC", "AC", "NJ", "24/7", "P&P Mechanical LLC" intact.
//   - Never auto-link inside model output. The HTML builder owns anchors.
//   - Only warn on TRUE suspicious merges, not on normal English words.

const STATE_ABBREVIATIONS = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
]);

const PROPER_NOUN_CITIES: Record<string, string> = {
  newark: 'Newark',
  passaic: 'Passaic',
  clifton: 'Clifton',
  paterson: 'Paterson',
  wayne: 'Wayne',
  totowa: 'Totowa',
  haledon: 'Haledon',
  hawthorne: 'Hawthorne',
  bloomfield: 'Bloomfield',
  montclair: 'Montclair',
  nutley: 'Nutley',
  lodi: 'Lodi',
  garfield: 'Garfield',
  hackensack: 'Hackensack',
  paramus: 'Paramus',
  secaucus: 'Secaucus',
  hoboken: 'Hoboken',
  'jersey city': 'Jersey City',
  'little falls': 'Little Falls',
  'woodland park': 'Woodland Park',
  'fair lawn': 'Fair Lawn',
  'elmwood park': 'Elmwood Park',
  'east orange': 'East Orange',
};

// Tokens that must never be re-cased by the city/proper-noun normalizer.
const PRESERVED_TOKENS = [
  'HVAC',
  'AC',
  'NJ',
  'NY',
  'NYC',
  'EPA',
  'SEER',
  'AFUE',
  'BTU',
  'VRF',
  'VRV',
];

// Ordered list: longer/more specific replacements first so partial matches
// don't shadow longer ones.
const KNOWN_BAD_MERGES: Array<[RegExp, string]> = [
  // HVAC compound merges
  [/\bHVAC(service|services|repair|installation|maintenance|contractor|company)\b/gi, 'HVAC $1'],
  [/\bAC(repair|installation|service|maintenance|unit)\b/gi, 'AC $1'],
  // Service/heating words frequently glued together
  [/\bheatingrepair\b/gi, 'heating repair'],
  [/\bheatinginstallation\b/gi, 'heating installation'],
  [/\bheatingservice\b/gi, 'heating service'],
  [/\bfurnacerepair\b/gi, 'furnace repair'],
  [/\bfurnaceinstallation\b/gi, 'furnace installation'],
  [/\bboilerrepair\b/gi, 'boiler repair'],
  [/\bboilerservice\b/gi, 'boiler service'],
  [/\bboilerinstallation\b/gi, 'boiler installation'],
  [/\bmini splitinstallation\b/gi, 'mini split installation'],
  [/\bminisplit\b/gi, 'mini split'],
  [/\bductworkinstallation\b/gi, 'ductwork installation'],
  [/\bthermostatreplacement\b/gi, 'thermostat replacement'],
  [/\bservicearea\b/gi, 'service area'],
  [/\bserviceareas\b/gi, 'service areas'],
  [/\bemergencyservice\b/gi, 'emergency service'],
  [/\bcommercialHVAC\b/gi, 'commercial HVAC'],
  [/\bresidentialHVAC\b/gi, 'residential HVAC'],
  // Common English glue words
  [/\bhomesand\b/gi, 'homes and'],
  [/\bbusinessesin\b/gi, 'businesses in'],
  [/\bcontactus\b/gi, 'contact us'],
  [/\bschedulean\b/gi, 'schedule an'],
  [/\bscheduleservice\b/gi, 'schedule service'],
  [/\brequestan\b/gi, 'request an'],
  [/\bnearby\b(\w)/gi, 'nearby $1'],
  // Proper-noun glue (multi-word cities + state)
  [/\bNorthJersey\b/g, 'North Jersey'],
  [/\bNewJersey\b/g, 'New Jersey'],
  [/\bPatersonNJ\b/g, 'Paterson NJ'],
  [/\bCliftonNJ\b/g, 'Clifton NJ'],
  [/\bPassaicNJ\b/g, 'Passaic NJ'],
];

// Patterns we use to DETECT (warn about) potentially-merged tokens that
// weren't caught by the explicit dictionary above.
const SUSPICIOUS_MERGE_PATTERNS: RegExp[] = [
  // HVAC stuck to a lowercase letter (e.g. "HVACservice")
  /\bHVAC[a-z]/,
  // AC stuck to a lowercase letter (e.g. "ACrepair")
  /\bAC[a-z]/,
];

// Words that look like merges but are real English — must not warn.
const FALSE_POSITIVE_WHITELIST = new Set([
  'mechanical',
  'commercial',
  'residential',
  'emergency',
  'service',
  'services',
  'maintenance',
  'installation',
  'installations',
  'conditioning',
  'refrigeration',
  'professional',
  'industrial',
  'specialist',
  'specialists',
  'technician',
  'technicians',
  'contractor',
  'contractors',
]);

export function normalizeCity(city: string): string {
  const trimmed = city.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  const known = PROPER_NOUN_CITIES[lower];
  if (known) return known;
  // Title case each word, but preserve hyphenated names and apostrophes.
  return trimmed
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === '-') return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

export function normalizeState(state: string): string {
  const trimmed = state.trim().toUpperCase();
  if (STATE_ABBREVIATIONS.has(trimmed)) return trimmed;
  // Pass-through anything else (full state names are valid too).
  return state.trim();
}

export function stripStrayMarkup(text: string): string {
  return (
    text
      // Strip any HTML tags the model may have leaked.
      .replace(/<[^>]+>/g, ' ')
      // Strip markdown bold/italic markers.
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Strip markdown headings at line starts.
      .replace(/^#+\s*/gm, '')
      // Strip backticks.
      .replace(/`+/g, '')
  );
}

export function normalizeTextSpacing(text: string): string {
  return (
    text
      // Collapse runs of whitespace (but preserve single newlines if any).
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      // Ensure a single space after sentence punctuation.
      .replace(/([.!?,;:])([A-Za-z])/g, '$1 $2')
      // Space between a digit and a letter ("100homes" -> "100 homes"),
      // but never split "24/7" or numeric units like "07011".
      .replace(/(\d)([A-Za-z])/g, (m, d, l) => (/[/-]/.test(m) ? m : `${d} ${l}`))
      .replace(/\s+/g, (m) => (m.includes('\n') ? '\n' : ' '))
      .trim()
  );
}

export function applyKnownBadMerges(text: string): string {
  let out = text;
  for (const [pattern, replacement] of KNOWN_BAD_MERGES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function canonicalizeProperNouns(text: string): string {
  let out = text;
  // "newark" / "Newark" anywhere in the body becomes "Newark" — but only when
  // surrounded by word boundaries so we don't mangle longer words.
  for (const [lower, canonical] of Object.entries(PROPER_NOUN_CITIES)) {
    const re = new RegExp(`\\b${lower.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    out = out.replace(re, canonical);
  }
  // Ensure preserved tokens keep their canonical casing even if the model
  // returned "hvac" / "ac" / "nj".
  for (const token of PRESERVED_TOKENS) {
    const re = new RegExp(`\\b${token}\\b`, 'gi');
    out = out.replace(re, token);
  }
  // Brand name canonicalization. We accept a few common variants but always
  // emit "P&P Mechanical LLC" — note the ampersand.
  out = out.replace(/\bP\s*&\s*P\s+Mechanical(\s+LLC)?\b/gi, 'P&P Mechanical LLC');
  out = out.replace(/\bPP\s+Mechanical(\s+LLC)?\b/g, 'P&P Mechanical LLC');
  return out;
}

export function enforceAnchorTagSpacing(text: string): string {
  // The pipeline outputs plain text — anchors come from the HTML builder. But
  // if any anchor sneaks in (e.g. inside FAQ answers), make sure it has a
  // space before and after. Avoids "can<a" or "</a>today" issues.
  return text.replace(/(\S)<a\b/g, '$1 <a').replace(/<\/a>(\S)/g, '</a> $1');
}

export function sanitizeSection(text: string): string {
  if (!text) return '';
  let out = stripStrayMarkup(text);
  out = applyKnownBadMerges(out);
  out = canonicalizeProperNouns(out);
  out = enforceAnchorTagSpacing(out);
  out = normalizeTextSpacing(out);
  return out;
}

export type SuspiciousMerge = {
  token: string;
  context: string;
};

export function detectSuspiciousMerges(text: string): SuspiciousMerge[] {
  const found: SuspiciousMerge[] = [];
  const seen = new Set<string>();

  for (const pattern of SUSPICIOUS_MERGE_PATTERNS) {
    const re = new RegExp(pattern.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      // Pull the full word the pattern matched inside.
      const wordRe = /[A-Za-z]+/g;
      wordRe.lastIndex = Math.max(0, match.index);
      const word = wordRe.exec(text)?.[0] ?? '';
      if (!word || seen.has(word)) continue;
      seen.add(word);
      if (FALSE_POSITIVE_WHITELIST.has(word.toLowerCase())) continue;
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + word.length + 20);
      found.push({ token: word, context: text.slice(start, end).trim() });
    }
  }
  return found;
}

/** Run the full pipeline on every plain-text section and collect warnings. */
export function sanitizeSections<T extends Record<string, string>>(
  sections: T,
): { sanitized: T; warnings: string[] } {
  const sanitized = {} as T;
  const warnings: string[] = [];
  for (const key of Object.keys(sections) as (keyof T)[]) {
    const value = sections[key];
    if (typeof value !== 'string') {
      sanitized[key] = value;
      continue;
    }
    const cleaned = sanitizeSection(value);
    (sanitized as Record<string, string>)[key as string] = cleaned;
    const merges = detectSuspiciousMerges(cleaned);
    for (const m of merges) {
      warnings.push(`suspicious_merge in ${String(key)}: "${m.token}" (…${m.context}…)`);
    }
  }
  return { sanitized, warnings };
}
