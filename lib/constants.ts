// Centralized business data. Replace TODO values with real production info.

export const BUSINESS = {
  name: 'P&P Mechanical LLC',
  legalName: 'P&P Mechanical LLC',
  // TODO: Replace with real phone number
  phone: '(973) 555-0123',
  phoneHref: 'tel:+19735550123',
  // TODO: Replace with real email
  email: 'service@ppmechanicalhvac.com',
  // TODO: Replace with real address
  address: {
    street: '123 Main Street',
    city: 'Clifton',
    region: 'NJ',
    postalCode: '07011',
    country: 'US',
  },
  // TODO: Replace with real NJ HVACR license number
  license: 'NJ HVACR Lic. #19HC00000000',
  founded: 2021,
  url: 'https://ppmechanicalhvac.com',
  hours: 'Mo-Su 00:00-24:00',
  social: {
    // TODO: Replace with real social URLs
    facebook: 'https://facebook.com/ppmechanicalhvac',
    instagram: 'https://instagram.com/ppmechanicalhvac',
    google: 'https://g.page/ppmechanicalhvac',
  },
} as const;

export type Service = {
  slug: string;
  name: string;
  short: string;
  description: string;
  startingPrice?: string;
  icon: string; // lucide-react icon name
  process: { title: string; description: string }[];
  whatsIncluded: string[];
  faqs: { q: string; a: string }[];
};

export const SERVICES: Service[] = [
  {
    slug: 'hvac-installation',
    name: 'HVAC Installation',
    short: 'New, high-efficiency heating & cooling systems installed by NJ-licensed pros.',
    description:
      'Complete HVAC system installation for North Jersey homes and small businesses. We size every system from a Manual J load calc — never guesswork — and back the work with a workmanship warranty.',
    startingPrice: 'Free estimates',
    icon: 'Wrench',
    process: [
      { title: 'Free in-home assessment', description: 'We measure load, evaluate ductwork, and listen to your goals.' },
      { title: 'Transparent flat-rate quote', description: 'No mystery markups — clear pricing on equipment and labor.' },
      { title: 'Scheduled professional install', description: 'EPA-certified crew, clean job site, daily walkthrough.' },
      { title: 'Quality check & owner training', description: 'We commission the system and show you how to run it efficiently.' },
    ],
    whatsIncluded: [
      'Manual J load calculation',
      'Removal & disposal of old equipment',
      'High-efficiency furnace or air handler',
      'Matched condenser & evaporator coil',
      'Smart thermostat (Ecobee or Nest)',
      'New refrigerant lineset & electrical hookup',
      'Permits, inspection & manufacturer registration',
      'Workmanship warranty + 10-yr parts (most brands)',
    ],
    faqs: [
      {
        q: 'How long does a full HVAC installation take in Clifton, NJ?',
        a: 'Most full residential systems are completed in one to two days, depending on whether ductwork modifications or electrical upgrades are required. We confirm a firm timeline in your written quote.',
      },
      {
        q: 'What size HVAC system do I need for my home?',
        a: 'Sizing is based on a Manual J load calculation — not square footage alone. We factor insulation, window count, orientation, ceiling height, and infiltration to right-size the unit, which avoids short-cycling and humidity issues.',
      },
      {
        q: 'Do you handle permits with the city of Clifton?',
        a: 'Yes. We pull mechanical and electrical permits with the municipality, schedule the inspection, and meet the inspector on-site.',
      },
      {
        q: 'What brands do you install?',
        a: 'We are factory-trained on Carrier, Trane, Lennox, Mitsubishi (ductless), Bosch, and Goodman. We recommend equipment that fits your home, budget, and efficiency goals — never push a brand to hit a quota.',
      },
      {
        q: 'Do you offer financing on new HVAC systems?',
        a: 'Yes. We partner with Wisetack and Synchrony to offer 0%–9.99% APR financing on approved credit, with monthly payments tailored to your budget.',
      },
    ],
  },
  {
    slug: 'hvac-repair',
    name: 'HVAC Repair',
    short: 'Fast diagnostics, transparent quotes, same-day repairs across North Jersey.',
    description:
      'When your system goes down, you need it fixed right the first time. Our diagnostic flat-rate gets us under the hood and into a plan — no hourly meter running.',
    startingPrice: '$89 diagnostic',
    icon: 'Cog',
    process: [
      { title: 'Same-day diagnostic visit', description: 'We arrive within the booked window with a stocked truck.' },
      { title: 'Pinpoint the failure', description: 'You see the meter reading, the failed part, the data.' },
      { title: 'Flat-rate repair quote', description: 'Authorize the work in writing — no surprises.' },
      { title: 'Fix & verify', description: 'We test cycle the system and clean the site before we leave.' },
    ],
    whatsIncluded: [
      'Full system diagnostic',
      'Refrigerant pressure & temperature check',
      'Electrical & capacitor testing',
      'Thermostat calibration',
      'Drain line clearing',
      'Written repair report',
      '90-day repair warranty',
    ],
    faqs: [
      {
        q: 'How fast can you get to my house?',
        a: 'Most service calls within Clifton, Passaic, and surrounding towns are booked the same day. Emergency calls are dispatched 24/7 — typical arrival is under 2 hours.',
      },
      {
        q: 'What does an HVAC repair cost in NJ?',
        a: 'Common repairs (capacitor, contactor, condensate pump) run $180–$450. Larger jobs (blower motor, compressor) are quoted flat-rate after diagnosis. We give you the number before we lift a wrench.',
      },
      {
        q: 'Will you waive the diagnostic fee if I book the repair?',
        a: 'Yes. The $89 diagnostic is credited toward any approved repair $300 or more.',
      },
      {
        q: 'Do you repair every brand?',
        a: 'We service every major residential brand — Carrier, Trane, Lennox, Goodman, Rheem, York, American Standard, Bryant, Mitsubishi, Daikin, and more.',
      },
      {
        q: 'My system is old. Should I repair or replace?',
        a: 'If the repair is more than 30% of replacement cost on a system over 12 years old, replacement usually pays back inside 4 years on energy savings alone. We give you both numbers and let you decide.',
      },
    ],
  },
  {
    slug: 'boiler-installation',
    name: 'Boiler Installation',
    short: 'Modern high-efficiency boilers for older NJ homes — hot water and steam.',
    description:
      'Clifton, Paterson, and Montclair have some of the oldest boiler stock in the country. We replace tired cast-iron units with sealed-combustion, condensing boilers that cut gas bills by 25–40% and run nearly silent.',
    startingPrice: 'Free estimates',
    icon: 'Flame',
    process: [
      { title: 'Heat-loss calculation', description: 'We size to the home, not to the old boiler.' },
      { title: 'Equipment & venting plan', description: 'Direct-vent or chimney-lined — we engineer it.' },
      { title: 'Professional install', description: 'New near-boiler piping, expansion tank, controls.' },
      { title: 'Combustion analysis', description: 'We dial in the burn for safety and peak efficiency.' },
    ],
    whatsIncluded: [
      'High-efficiency condensing boiler',
      'Near-boiler piping rework',
      'Sealed-combustion venting',
      'New expansion tank & circulator',
      'Outdoor reset control',
      'Indirect water heater option',
      'Permits & combustion analysis report',
    ],
    faqs: [
      {
        q: 'How much does a new boiler cost in Clifton, NJ?',
        a: 'Residential gas boiler replacements typically range from $7,500 to $14,000 installed, depending on size, efficiency tier (80% vs 95%+ condensing), and venting complexity.',
      },
      {
        q: 'Can I replace my steam boiler with hot water?',
        a: 'Sometimes. A full conversion requires new radiators and piping and is rarely cost-effective. We almost always recommend replacing steam-for-steam with a modern high-efficiency unit.',
      },
      {
        q: 'Are there rebates for high-efficiency boilers in NJ?',
        a: 'Yes — NJ Clean Energy and most utilities offer $300–$1,200 rebates on qualifying high-efficiency boilers. We handle the paperwork for you.',
      },
      {
        q: 'How long does a boiler replacement take?',
        a: 'Typical replacements take one to two days. Heat is restored before we leave the property.',
      },
      {
        q: 'What brands of boilers do you install?',
        a: 'Navien, Weil-McLain, Buderus, Burnham, Lochinvar, and Triangle Tube — chosen based on home size, fuel type, and budget.',
      },
    ],
  },
  {
    slug: 'boiler-repair',
    name: 'Boiler Repair',
    short: 'No heat? We diagnose and repair gas, oil, and steam boilers around the clock.',
    description:
      'Boiler problems in a Jersey winter are a true emergency. Our techs are trained on every major residential boiler — from 1950s American Standard cast-iron to brand-new Navien wall-hangs.',
    startingPrice: '$89 diagnostic',
    icon: 'Thermometer',
    process: [
      { title: '24/7 emergency dispatch', description: 'Pick up the phone — a human answers.' },
      { title: 'Full diagnostic', description: 'Combustion, ignition, controls, circulator, expansion.' },
      { title: 'Flat-rate repair', description: 'Authorize the price before any work begins.' },
      { title: 'Combustion verification', description: 'We test the burn to make sure it is safe and clean.' },
    ],
    whatsIncluded: [
      'Combustion & ignition check',
      'Pressure & temperature diagnostics',
      'Circulator & expansion tank service',
      'Low-water cutoff testing',
      'Carbon-monoxide safety check',
      '90-day repair warranty',
    ],
    faqs: [
      {
        q: 'My boiler is making banging noises — is it dangerous?',
        a: 'Banging usually means trapped air, scale buildup, or a failing expansion tank. Get it serviced before it leads to a leak. We can be on-site the same day.',
      },
      {
        q: 'Is a leaking boiler an emergency?',
        a: 'Yes. A leaking boiler can lose pressure, fail to fire, and damage flooring. Shut off the unit and the water supply and call us — we run 24/7.',
      },
      {
        q: 'How often should I service my boiler?',
        a: 'Annually, before the heating season. A pro tune-up catches small issues and keeps the warranty intact.',
      },
      {
        q: 'My boiler is short-cycling. What does that mean?',
        a: 'Short-cycling — rapid on/off — usually means the boiler is oversized, the aquastat is misconfigured, or there is a flow problem. It wastes fuel and shortens equipment life.',
      },
      {
        q: 'Can you repair oil-fired boilers?',
        a: 'Yes. We service gas, oil, and steam boilers from every major manufacturer.',
      },
    ],
  },
  {
    slug: 'ac-installation',
    name: 'AC Installation',
    short: 'Central air, ductless mini-splits, and high-velocity systems engineered for NJ.',
    description:
      'From a single-zone mini-split to a full central system, we right-size and install AC that cools evenly, runs quietly, and survives the NJ humidity.',
    startingPrice: 'Free estimates',
    icon: 'Snowflake',
    process: [
      { title: 'In-home cooling assessment', description: 'Room-by-room measurement, not square-foot guessing.' },
      { title: 'System options & quote', description: 'Central, ductless, or hybrid — pros and cons of each.' },
      { title: 'Clean install', description: 'Floor coverings, no debris, daily walkthrough.' },
      { title: 'Start-up & training', description: 'Refrigerant charge by weight, control tuning, owner walkthrough.' },
    ],
    whatsIncluded: [
      'Manual J load calculation',
      'High-efficiency condenser (up to 22 SEER2)',
      'Matched evaporator coil or air handler',
      'New refrigerant lineset',
      'Smart thermostat',
      'Pad, disconnect & electrical',
      'Permits & manufacturer registration',
    ],
    faqs: [
      {
        q: 'Should I get central AC or ductless mini-splits?',
        a: 'If you already have ductwork in good condition, central is usually cheaper to install. If you have radiators or hot-water baseboard heat with no ducts, ductless is dramatically cheaper than retrofitting ducts and lets you zone the home.',
      },
      {
        q: 'How much does central AC cost in NJ?',
        a: 'Most full central systems for a 1,500–2,500 sqft Clifton home land between $8,500 and $14,000 installed depending on SEER rating and equipment tier.',
      },
      {
        q: 'How long do AC systems last?',
        a: 'A well-maintained system lasts 12–17 years. Coastal/humid climates and lack of annual service shorten that.',
      },
      {
        q: 'What SEER rating should I buy?',
        a: 'For most NJ homes, 16–18 SEER2 hits the sweet spot of upfront cost and energy savings. Higher tiers make sense if you run AC heavily or qualify for utility rebates.',
      },
      {
        q: 'Do you offer financing on AC installation?',
        a: 'Yes — 0%–9.99% APR through Wisetack/Synchrony on approved credit.',
      },
    ],
  },
  {
    slug: 'ac-repair',
    name: 'AC Repair',
    short: 'Same-day AC repair when North Jersey humidity hits triple digits.',
    description:
      'When the AC quits on a 95° day, our trucks roll. Flat-rate diagnostic, transparent repair pricing, 90-day workmanship warranty.',
    startingPrice: '$89 diagnostic',
    icon: 'Wind',
    process: [
      { title: 'Same-day dispatch', description: 'Booked window, on-time arrival, stocked truck.' },
      { title: 'Pinpoint diagnosis', description: 'Pressures, temps, electrical — you see the readings.' },
      { title: 'Flat-rate repair', description: 'Approve the price before we touch a tool.' },
      { title: 'Verify & clean up', description: 'Cycle test, supply temp check, debris removed.' },
    ],
    whatsIncluded: [
      'Refrigerant pressure & temperature check',
      'Capacitor & contactor testing',
      'Condenser coil rinse',
      'Drain line clearing',
      'Thermostat calibration',
      '90-day repair warranty',
    ],
    faqs: [
      {
        q: 'My AC is blowing warm air — what is wrong?',
        a: 'Most common causes: failed capacitor, low refrigerant from a leak, a frozen evaporator coil, or a tripped breaker. A diagnostic will isolate it within 30 minutes.',
      },
      {
        q: 'How much does an AC repair cost?',
        a: 'Capacitor replacement: $220–$380. Contactor: $200–$340. Refrigerant leak repair & recharge: $450–$1,400 depending on the leak location.',
      },
      {
        q: 'Is it worth repairing a 15-year-old AC?',
        a: 'If the repair is over $1,000, usually no — a new system pays back inside 4–5 years on energy savings, plus you get a fresh warranty.',
      },
      {
        q: 'My AC freezes up. Why?',
        a: 'Either low refrigerant or restricted airflow (dirty filter, blocked return, failing blower). Run the fan-only mode to thaw, then call us.',
      },
      {
        q: 'Do you service rooftop and ductless units?',
        a: 'Yes — light commercial rooftop, ductless mini-splits, and standard split systems.',
      },
    ],
  },
  {
    slug: 'emergency-hvac',
    name: '24/7 Emergency HVAC',
    short: 'No heat, no AC, no questions — our after-hours line is staffed every day of the year.',
    description:
      'A real technician answers your call at 2 a.m. on Christmas. We dispatch a stocked truck and most calls are resolved on the first visit.',
    icon: 'Siren',
    process: [
      { title: 'Live call, any hour', description: 'A real person — never an answering service.' },
      { title: 'ETA in 5 minutes', description: 'You get a firm arrival window before you hang up.' },
      { title: 'Diagnose & quote on-site', description: 'Written flat-rate before any work begins.' },
      { title: 'Restore heat or cooling', description: 'Most emergencies fixed in a single visit.' },
    ],
    whatsIncluded: [
      '24/7/365 live dispatch',
      'After-hours arrival within 2 hours (typical)',
      'Stocked emergency-repair trucks',
      'Furnace, boiler, AC & heat-pump coverage',
      'Carbon-monoxide safety verification',
    ],
    faqs: [
      {
        q: 'What counts as an HVAC emergency?',
        a: 'No heat in winter, no AC in extreme heat, a gas smell, a CO alarm, a leaking boiler, or a tripping breaker. When in doubt — call.',
      },
      {
        q: 'How much extra do you charge for after-hours service?',
        a: 'Our after-hours service fee is $150 on top of the standard diagnostic, waived if you authorize a repair of $600 or more.',
      },
      {
        q: 'Do you carry parts on the truck?',
        a: 'Yes — capacitors, contactors, igniters, thermocouples, blower motors, common circulators, and refrigerant. Most repairs are completed on the first visit.',
      },
      {
        q: 'What if I smell gas?',
        a: 'Leave the house immediately, call PSE&G or the fire department, then call us once the area is safe.',
      },
      {
        q: 'Do you service commercial buildings 24/7?',
        a: 'Yes — light commercial accounts have priority dispatch. Ask about our service-contract pricing.',
      },
    ],
  },
  {
    slug: 'maintenance-plans',
    name: 'Maintenance Plans',
    short: 'Tune-ups, priority dispatch, and 15% off all repairs — for less than a tank of gas a month.',
    description:
      'Our Comfort Club keeps your equipment running at peak efficiency, extends its life, and gets you to the front of the line when the rest of NJ is calling for service.',
    startingPrice: 'From $18/mo',
    icon: 'ShieldCheck',
    process: [
      { title: 'Spring AC tune-up', description: 'Full performance & safety inspection.' },
      { title: 'Fall heating tune-up', description: 'Combustion analysis, safety check, calibration.' },
      { title: 'Priority dispatch', description: 'Front of the line on every service call.' },
      { title: 'Member-only discounts', description: '15% off all repairs and accessory installs.' },
    ],
    whatsIncluded: [
      '2 precision tune-ups per year',
      'Priority emergency dispatch',
      '15% discount on all repairs',
      'No after-hours surcharge',
      'Filter & humidifier pad delivery',
      'Annual safety & CO check',
      'Transferable to a new home',
    ],
    faqs: [
      {
        q: 'What is included in a tune-up?',
        a: '21-point inspection: combustion test, refrigerant pressure check, electrical tightening, drain clearing, blower amp draw, capacitor test, condensate pan flush, and a written health report.',
      },
      {
        q: 'How much does the Comfort Club cost?',
        a: 'Single-system membership is $18/month or $199/year. Each additional system is $10/month.',
      },
      {
        q: 'Will membership pay for itself?',
        a: 'Most members break even after a single repair or one fewer service call. Plus, annual tune-ups typically extend equipment life by 3–5 years.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. No contracts, no cancellation fees.',
      },
      {
        q: 'Does the plan cover boilers too?',
        a: 'Yes — combo plans cover gas furnaces, boilers, central AC, heat pumps, and ductless mini-splits.',
      },
    ],
  },
];

export type Location = {
  slug: string;
  name: string;
  county: string;
  zip: string;
  intro: string;
  housingNote: string;
  nearby: string[];
};

export const LOCATIONS: Location[] = [
  {
    slug: 'clifton-nj',
    name: 'Clifton',
    county: 'Passaic County',
    zip: '07011',
    intro:
      "Clifton is P&P Mechanical's home base, and we treat it that way. From the prewar two-families in Botany Village to the newer construction off Allwood Road, our techs know the housing stock — the cast-iron boilers in the bungalows, the rooftop units behind the businesses on Main Avenue, and the heat pumps going into the new builds near Athenia. We run dispatch out of Clifton, which means tighter arrival windows, lower trip charges, and a real person on the phone at 2 a.m. when your heat quits in January. Whether you need a 95% AFUE boiler swapped in before the cold front, a same-day AC repair on a humid August afternoon, or a maintenance plan to keep everything humming, we are five minutes away.",
    housingNote:
      "Many Clifton homes still run on aging cast-iron steam or hot-water boilers — replacement with a modern condensing boiler typically cuts gas bills by 25–35%. Our techs know the original American Standard and Burnham systems backwards.",
    nearby: ['passaic-nj', 'paterson-nj', 'nutley-nj', 'bloomfield-nj'],
  },
  {
    slug: 'passaic-nj',
    name: 'Passaic',
    county: 'Passaic County',
    zip: '07055',
    intro:
      "Passaic's mix of historic multi-family homes and small commercial buildings keeps our techs busy year-round. We handle everything from a single-zone ductless install in a tight third-floor walk-up to full rooftop unit replacements on Main Avenue storefronts. Passaic homes — particularly the older two- and three-family stock — frequently have undersized electrical service, awkward chimney runs, and aging steam systems, and we have a deep playbook for all of it. Same-day service and after-hours dispatch are available throughout the 07055 ZIP code, and we pull every permit through the City of Passaic ourselves.",
    housingNote:
      "Passaic's three-decker housing stock often needs creative venting solutions on boiler swaps. Direct-vent and concentric vent installs are our bread and butter here.",
    nearby: ['clifton-nj', 'paterson-nj', 'wayne-nj', 'bloomfield-nj'],
  },
  {
    slug: 'paterson-nj',
    name: 'Paterson',
    county: 'Passaic County',
    zip: '07501',
    intro:
      "Paterson's housing dates back over a century in many neighborhoods, and we have learned every quirk of working in tight basements with original cast-iron radiators. Our crews serve Eastside, the 4th Ward, Riverside, Totowa Section, and everything in between. We replace failing oil and gas boilers with high-efficiency condensing units, swap out 30-year-old central AC for modern 18-SEER systems, and run preventive maintenance for landlords with multi-unit portfolios. After-hours and 24/7 emergency service is available across every Paterson ZIP.",
    housingNote:
      "Paterson's older multi-family buildings often have shared chimneys and undersized gas service. We size carefully and coordinate with PSE&G when meter upgrades are needed.",
    nearby: ['clifton-nj', 'passaic-nj', 'wayne-nj', 'east-orange-nj'],
  },
  {
    slug: 'wayne-nj',
    name: 'Wayne',
    county: 'Passaic County',
    zip: '07470',
    intro:
      "Wayne's sprawl of ranches, splits, and newer colonials gives us a wide variety of HVAC work — from straightforward central AC replacements off Hamburg Turnpike to whole-house ductless retrofits on tougher mid-century floor plans near Packanack Lake. We are factory-trained on Carrier, Trane, Lennox, and Mitsubishi, and we right-size every system with a Manual J load calculation instead of guessing from square footage. Same-day service, after-hours emergency dispatch, and free in-home quotes are available everywhere in 07470 and 07477.",
    housingNote:
      "Wayne's large 1960s-80s ranch and split-level homes often have undersized return ducts. We almost always recommend pulling a second return on AC replacements to fix airflow imbalance.",
    nearby: ['clifton-nj', 'paterson-nj', 'passaic-nj', 'montclair-nj'],
  },
  {
    slug: 'bloomfield-nj',
    name: 'Bloomfield',
    county: 'Essex County',
    zip: '07003',
    intro:
      "Bloomfield's mix of historic Watsessing colonials, Brookdale ranches, and apartment buildings near the Newark line keeps our service trucks moving. Many of these homes still run on original 80s-era boilers and central AC, and we specialize in clean, code-compliant replacements that respect the architecture — no PVC vent pipe poking out the front of a 1920s revival. Our techs are NJ licensed, EPA certified, and trained on every major residential brand. We pull permits with the township ourselves and walk you through the entire process.",
    housingNote:
      "Many Bloomfield homes near Watsessing Park were built before AC was standard. Ductless mini-splits are the cleanest way to add cooling without ripping plaster.",
    nearby: ['clifton-nj', 'nutley-nj', 'montclair-nj', 'east-orange-nj'],
  },
  {
    slug: 'montclair-nj',
    name: 'Montclair',
    county: 'Essex County',
    zip: '07042',
    intro:
      "Montclair's beautiful prewar housing stock is one of the most rewarding — and one of the most challenging — markets we work in. Plaster walls, balloon framing, original radiators, and the architectural standards homeowners (rightly) expect mean we approach every Montclair project with a higher bar. From sealed-combustion condensing boilers in Estate Section colonials to high-velocity Unico systems for homes that cannot accept conventional ductwork, we have the tools and the experience. We coordinate with Montclair Township on permits and inspections directly.",
    housingNote:
      "Many Montclair homes cannot accept standard ductwork. Mini-duct (Unico) systems and ductless mini-splits are often the right call for both cooling and architectural preservation.",
    nearby: ['bloomfield-nj', 'nutley-nj', 'clifton-nj', 'east-orange-nj'],
  },
  {
    slug: 'nutley-nj',
    name: 'Nutley',
    county: 'Essex County',
    zip: '07110',
    intro:
      "Nutley's tight-knit neighborhoods of mid-century capes and colonials sit right between our Clifton dispatch and our Bloomfield/Montclair service area, so response times here are some of the fastest in our territory. We handle furnace and boiler replacements, central AC installs, ductless retrofits, and emergency service across every Nutley ZIP. Many of these homes have small basements and tight mechanical rooms — we plan the install around the home, not the other way around.",
    housingNote:
      "Nutley capes and colonials frequently have cramped mechanical rooms. Wall-hung condensing boilers save floor space and run quieter than traditional cast-iron units.",
    nearby: ['clifton-nj', 'bloomfield-nj', 'montclair-nj', 'passaic-nj'],
  },
  {
    slug: 'east-orange-nj',
    name: 'East Orange',
    county: 'Essex County',
    zip: '07017',
    intro:
      "East Orange's housing — from the grand prewar apartment buildings to the single-family colonials near Elmwood Park — keeps us working on systems large and small. We service landlord and condo-association accounts with rooftop unit swaps, central plant maintenance, and tenant unit repairs, and we serve single-family homeowners with everything from quick filter swaps to full central AC and high-efficiency boiler installs. Same-day and 24/7 emergency dispatch is available citywide.",
    housingNote:
      "Older East Orange multi-family buildings often run on a single central boiler. Annual combustion analysis and safety checks are critical — we offer landlord service contracts for these.",
    nearby: ['bloomfield-nj', 'montclair-nj', 'nutley-nj', 'clifton-nj'],
  },
];

export const ALL_SERVICE_AREAS = [
  'Clifton',
  'Passaic',
  'Paterson',
  'Wayne',
  'Bloomfield',
  'Montclair',
  'Nutley',
  'East Orange',
  'Little Falls',
  'Totowa',
  'Lodi',
  'Garfield',
  'Hackensack',
  'Paramus',
];

export const TRUST_BADGES = [
  'Licensed & Insured',
  'Same-Day Service',
  'Free Estimates',
  'Financing Available',
];

export const STATS = [
  { value: 500, suffix: '+', label: 'Jobs Completed' },
  { value: 4.9, suffix: '★', label: 'Average Rating', decimal: true },
  { value: 2021, suffix: '', label: 'Serving NJ Since', raw: true },
  { value: 24, suffix: '/7', label: 'Emergency Service' },
];

export const TESTIMONIALS = [
  {
    name: 'Maria R.',
    city: 'Clifton, NJ',
    rating: 5,
    text:
      'Our boiler died on the coldest night of the year. P&P picked up the phone at 11 p.m., had a tech here by midnight, and a new high-efficiency unit installed two days later. Pricing was clear, the crew was respectful, and the heat has not blinked since. They have a customer for life.',
  },
  {
    name: 'David K.',
    city: 'Montclair, NJ',
    rating: 5,
    text:
      'We had three other companies quote us on central AC for our 1920s house and every one of them wanted to rip out plaster. P&P proposed a Unico high-velocity system instead — quieter, cleaner, and we kept every wall intact. The owner was on-site for the final walkthrough. Genuinely impressive operation.',
  },
  {
    name: 'James and Liz P.',
    city: 'Wayne, NJ',
    rating: 5,
    text:
      'Same-day AC repair in the middle of a heat wave — they were here within 90 minutes, diagnosed a failed capacitor, and had it fixed for a flat fee, no hourly games. We signed up for their Comfort Club afterwards. Cannot recommend them enough.',
  },
];

export const SERVICE_AREA_CITIES = ALL_SERVICE_AREAS;
