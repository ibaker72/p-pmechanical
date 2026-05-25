// Centralized business data. Replace TODO values with real production info.

export const BUSINESS = {
  name: 'P&P Mechanical LLC',
  legalName: 'P&P Mechanical LLC',
  // TODO: Replace with real phone number
  phone: '(201) 456-5151',
  phoneHref: 'tel:+12014565151',
  // TODO: Replace with real email
  email: 'service@ppmechanicalhvac.com',
  // Home-based business — no public street address by design.
  address: {
    city: 'Clifton',
    region: 'NJ',
    postalCode: '07011',
    country: 'US',
  },
  serviceArea: 'Serving all of Passaic & Essex Counties',
  // TODO: Add real NJ HVACR license number when available.
  license: 'Licensed & Insured in NJ',
  founded: 2021,
  url: 'https://ppmechanicalllc.com',
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
  segment: 'residential' | 'commercial';
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
    segment: 'residential',
    short: 'New, high-efficiency heating & cooling systems installed by NJ-licensed pros.',
    description:
      'Complete HVAC system installation for North Jersey homes and small businesses. We size every system from a Manual J load calc — never guesswork — and back the work with a workmanship warranty.',
    startingPrice: 'Free estimates',
    icon: 'Wrench',
    process: [
      {
        title: 'Free in-home assessment',
        description: 'We measure load, evaluate ductwork, and listen to your goals.',
      },
      {
        title: 'Transparent flat-rate quote',
        description: 'No mystery markups — clear pricing on equipment and labor.',
      },
      {
        title: 'Scheduled professional install',
        description: 'EPA-certified crew, clean job site, daily walkthrough.',
      },
      {
        title: 'Quality check & owner training',
        description: 'We commission the system and show you how to run it efficiently.',
      },
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
    segment: 'residential',
    short: 'Fast diagnostics, transparent quotes, same-day repairs across North Jersey.',
    description:
      'When your system goes down, you need it fixed right the first time. Our diagnostic flat-rate gets us under the hood and into a plan — no hourly meter running.',
    startingPrice: '$89 diagnostic',
    icon: 'Cog',
    process: [
      {
        title: 'Same-day diagnostic visit',
        description: 'We arrive within the booked window with a stocked truck.',
      },
      {
        title: 'Pinpoint the failure',
        description: 'You see the meter reading, the failed part, the data.',
      },
      {
        title: 'Flat-rate repair quote',
        description: 'Authorize the work in writing — no surprises.',
      },
      {
        title: 'Fix & verify',
        description: 'We test cycle the system and clean the site before we leave.',
      },
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
    segment: 'residential',
    short: 'Modern high-efficiency boilers for older NJ homes — hot water and steam.',
    description:
      'Clifton, Paterson, and Montclair have some of the oldest boiler stock in the country. We replace tired cast-iron units with sealed-combustion, condensing boilers that cut gas bills by 25–40% and run nearly silent.',
    startingPrice: 'Free estimates',
    icon: 'Flame',
    process: [
      {
        title: 'Heat-loss calculation',
        description: 'We size to the home, not to the old boiler.',
      },
      {
        title: 'Equipment & venting plan',
        description: 'Direct-vent or chimney-lined — we engineer it.',
      },
      {
        title: 'Professional install',
        description: 'New near-boiler piping, expansion tank, controls.',
      },
      {
        title: 'Combustion analysis',
        description: 'We dial in the burn for safety and peak efficiency.',
      },
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
    segment: 'residential',
    short: 'No heat? We diagnose and repair gas, oil, and steam boilers around the clock.',
    description:
      'Boiler problems in a Jersey winter are a true emergency. Our techs are trained on every major residential boiler — from 1950s American Standard cast-iron to brand-new Navien wall-hangs.',
    startingPrice: '$89 diagnostic',
    icon: 'Thermometer',
    process: [
      { title: '24/7 emergency dispatch', description: 'Pick up the phone — a human answers.' },
      {
        title: 'Full diagnostic',
        description: 'Combustion, ignition, controls, circulator, expansion.',
      },
      { title: 'Flat-rate repair', description: 'Authorize the price before any work begins.' },
      {
        title: 'Combustion verification',
        description: 'We test the burn to make sure it is safe and clean.',
      },
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
    segment: 'residential',
    short: 'Central air, ductless mini-splits, and high-velocity systems engineered for NJ.',
    description:
      'From a single-zone mini-split to a full central system, we right-size and install AC that cools evenly, runs quietly, and survives the NJ humidity.',
    startingPrice: 'Free estimates',
    icon: 'Snowflake',
    process: [
      {
        title: 'In-home cooling assessment',
        description: 'Room-by-room measurement, not square-foot guessing.',
      },
      {
        title: 'System options & quote',
        description: 'Central, ductless, or hybrid — pros and cons of each.',
      },
      { title: 'Clean install', description: 'Floor coverings, no debris, daily walkthrough.' },
      {
        title: 'Start-up & training',
        description: 'Refrigerant charge by weight, control tuning, owner walkthrough.',
      },
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
    segment: 'residential',
    short: 'Same-day AC repair when North Jersey humidity hits triple digits.',
    description:
      'When the AC quits on a 95° day, our trucks roll. Flat-rate diagnostic, transparent repair pricing, 90-day workmanship warranty.',
    startingPrice: '$89 diagnostic',
    icon: 'Wind',
    process: [
      { title: 'Same-day dispatch', description: 'Booked window, on-time arrival, stocked truck.' },
      {
        title: 'Pinpoint diagnosis',
        description: 'Pressures, temps, electrical — you see the readings.',
      },
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
    segment: 'residential',
    short: 'No heat, no AC, no questions — our after-hours line is staffed every day of the year.',
    description:
      'A real technician answers your call at 2 a.m. on Christmas. We dispatch a stocked truck and most calls are resolved on the first visit.',
    icon: 'Siren',
    process: [
      { title: 'Live call, any hour', description: 'A real person — never an answering service.' },
      {
        title: 'ETA in 5 minutes',
        description: 'You get a firm arrival window before you hang up.',
      },
      {
        title: 'Diagnose & quote on-site',
        description: 'Written flat-rate before any work begins.',
      },
      {
        title: 'Restore heat or cooling',
        description: 'Most emergencies fixed in a single visit.',
      },
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
    segment: 'residential',
    short:
      'Tune-ups, priority dispatch, and 15% off all repairs — for less than a tank of gas a month.',
    description:
      'Our Comfort Club keeps your equipment running at peak efficiency, extends its life, and gets you to the front of the line when the rest of NJ is calling for service.',
    startingPrice: 'From $18/mo',
    icon: 'ShieldCheck',
    process: [
      { title: 'Spring AC tune-up', description: 'Full performance & safety inspection.' },
      {
        title: 'Fall heating tune-up',
        description: 'Combustion analysis, safety check, calibration.',
      },
      { title: 'Priority dispatch', description: 'Front of the line on every service call.' },
      {
        title: 'Member-only discounts',
        description: '15% off all repairs and accessory installs.',
      },
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

  // --- Commercial services ---
  {
    slug: 'commercial-hvac-installation',
    name: 'Commercial HVAC Installation',
    segment: 'commercial',
    short:
      'Design-build commercial HVAC for offices, retail, restaurants, warehouses, and industrial facilities across North Jersey.',
    description:
      'From a single rooftop unit replacement on a strip-mall storefront to a multi-system design-build for a new commercial building, our commercial division handles HVAC at any scale. NJ-licensed, fully insured, OSHA-trained crews and engineered designs sized to ACCA Manual N — never guessed.',
    icon: 'Building2',
    process: [
      {
        title: 'Site walk & load analysis',
        description: 'Manual N or block-load calc, ventilation review, electrical capacity check.',
      },
      {
        title: 'Engineered proposal',
        description:
          'Equipment schedule, single-line diagrams, capital and operating-cost projections.',
      },
      {
        title: 'Permitting & coordination',
        description:
          'We pull mechanical, electrical, and roofing permits and coordinate with GC, landlord, and tenants.',
      },
      {
        title: 'Install, commission, train',
        description:
          'Phased install with minimal downtime, full commissioning, and operator training on day one.',
      },
    ],
    whatsIncluded: [
      'Manual N / block load engineering',
      'High-efficiency packaged or split equipment',
      'Curb adapters, structural review, crane lifts',
      'Variable-speed drives & demand-control ventilation',
      'Smart controls / BAS integration',
      'Permits, inspections, and manufacturer registration',
      'Owner training and as-built documentation',
      'Workmanship warranty + extended equipment coverage',
    ],
    faqs: [
      {
        q: 'What size commercial jobs do you take on?',
        a: 'Anything from a 3-ton rooftop swap on a single storefront up to multi-hundred-ton plants for office buildings, warehouses, and industrial facilities. No scope limit — if it heats or cools a commercial building, we do it.',
      },
      {
        q: 'Can you work around our business hours?',
        a: 'Yes. Most commercial installs are phased so that occupied spaces stay conditioned during business hours, with disruptive work scheduled nights and weekends. We build the schedule around your operation.',
      },
      {
        q: 'Do you handle the structural and electrical side?',
        a: 'Yes. We coordinate roof structural review, crane lifts, electrical service upgrades, and gas-line work in-house or with licensed partner contractors. One point of contact for the whole job.',
      },
      {
        q: 'What brands do you install on commercial projects?',
        a: 'Carrier, Trane, Lennox, Daikin, Mitsubishi, LG, Bosch, AAON, and Lochinvar — chosen to fit the application, efficiency target, and budget.',
      },
    ],
  },
  {
    slug: 'commercial-hvac-repair',
    name: 'Commercial HVAC Repair',
    segment: 'commercial',
    short:
      '24/7 commercial HVAC diagnostics and repair — no system, no brand, no scope we will not tackle.',
    description:
      'When a commercial system goes down, every hour costs money. Our commercial techs roll with stocked trucks, factory training across every major brand, and the diagnostic equipment to fix it on the first visit whenever parts allow.',
    icon: 'Cog',
    process: [
      {
        title: 'Priority dispatch',
        description: 'Service-contract customers get front-of-line dispatch 24/7.',
      },
      {
        title: 'Full diagnostic',
        description:
          'Combustion, refrigerant, electrical, and controls — instrumented, not guessed.',
      },
      {
        title: 'Written repair quote',
        description: 'Flat-rate or T&M with a not-to-exceed — your call.',
      },
      {
        title: 'Repair, test, document',
        description: 'Cycle test, log readings, leave a written service ticket on every visit.',
      },
    ],
    whatsIncluded: [
      'Rooftop unit (RTU) repair',
      'Split-system & VRF/VRV repair',
      'Chiller and cooling-tower service',
      'Commercial boiler and water-heater repair',
      'Controls, BAS, and thermostat troubleshooting',
      'Refrigerant leak detection and EPA-compliant recovery',
      'Written service tickets with photos',
    ],
    faqs: [
      {
        q: 'Are you available after hours for commercial outages?',
        a: 'Yes — 24/7/365. Service-contract customers get priority dispatch with a guaranteed response window.',
      },
      {
        q: 'Do you service every brand?',
        a: 'Yes. Carrier, Trane, Lennox, York, Daikin, Mitsubishi, LG, AAON, Bosch, Bryant, Reznor, and more. We carry common parts for all of them on the truck.',
      },
      {
        q: 'Can you work on our existing service contract terms?',
        a: 'Yes — we can quote against your existing PM schedule, take over from another contractor mid-term, or write a new contract from scratch.',
      },
    ],
  },
  {
    slug: 'commercial-boiler-installation',
    name: 'Commercial Boiler Installation',
    segment: 'commercial',
    short:
      'High-efficiency commercial boiler installs — from 300 MBH wall-hangs to multi-million-BTU plant rebuilds.',
    description:
      'Commercial boiler work demands engineering and craftsmanship most contractors cannot offer. We handle the full scope: combustion engineering, near-boiler piping, primary-secondary loops, modulating controls, and combustion-analysis commissioning. Every install is sized, vented, and tuned by techs who do this every day.',
    icon: 'Flame',
    process: [
      {
        title: 'Heat-loss & demand study',
        description: 'We size to the building, not to the old boiler.',
      },
      {
        title: 'Equipment & piping design',
        description: 'Primary-secondary, low-loss header, or full plant rebuild.',
      },
      {
        title: 'Install & venting',
        description: 'Sealed-combustion, B-vent, or stainless category IV venting as required.',
      },
      {
        title: 'Combustion commissioning',
        description: 'Full combustion analysis, written commissioning report, operator training.',
      },
    ],
    whatsIncluded: [
      'Modulating condensing boilers (95%+ AFUE)',
      'Multi-boiler lead-lag plants with redundancy',
      'Primary-secondary or low-loss header piping',
      'Outdoor reset and BAS-integrated controls',
      'Indirect or storage water heaters',
      'Stainless category IV venting',
      'Permits and final combustion-analysis report',
    ],
    faqs: [
      {
        q: 'How long does a commercial boiler replacement take?',
        a: 'Single-boiler swaps for small offices typically take 3–5 days. Multi-boiler plant rebuilds for larger buildings are scheduled 2–6 weeks depending on scope. We can run temporary heat where required.',
      },
      {
        q: 'Do you handle steam plants?',
        a: 'Yes. Low-pressure and high-pressure steam, including process steam for laundries, dry cleaners, and food service. We do not shy away from older steam infrastructure.',
      },
      {
        q: 'Are NJ Clean Energy commercial rebates available?',
        a: 'Yes — NJ Clean Energy offers significant rebates on qualifying high-efficiency commercial boilers, plus federal tax incentives. We handle the paperwork.',
      },
    ],
  },
  {
    slug: 'commercial-boiler-repair',
    name: 'Commercial Boiler Service & Repair',
    segment: 'commercial',
    short:
      'Emergency commercial boiler repair, combustion tuning, and full mechanical-room rebuilds — 24/7.',
    description:
      'A commercial boiler failure in winter means lost revenue, frozen pipes, or unhappy tenants. We carry the parts, controls, and combustion analyzers to diagnose and repair every commercial boiler brand on the market, and we maintain a roster of rental boilers for true emergencies.',
    icon: 'Thermometer',
    process: [
      {
        title: '24/7 priority dispatch',
        description: 'Service-contract customers get a guaranteed response window.',
      },
      {
        title: 'Full diagnostic',
        description: 'Combustion, ignition, controls, circulators, flow, and safety devices.',
      },
      {
        title: 'Flat-rate or T&M quote',
        description: 'Approve scope in writing before work begins.',
      },
      {
        title: 'Repair, tune, document',
        description:
          'Combustion analysis on every visit, written service ticket logged to your account.',
      },
    ],
    whatsIncluded: [
      'Combustion analysis on every service visit',
      'Ignition, flame-safeguard, and control diagnostics',
      'Circulator, expansion, and air-elimination service',
      'Low-water cutoff testing and certification',
      'Burner tuning and efficiency reports',
      'Emergency rental-boiler dispatch (when required)',
    ],
    faqs: [
      {
        q: 'Do you carry rental boilers for emergencies?',
        a: 'Yes. We can deploy temporary boilers to maintain occupied buildings during major repairs. Coordinated through our service-contract program.',
      },
      {
        q: 'How often should a commercial boiler be serviced?',
        a: 'At least annually before the heating season; high-fire commercial steam plants benefit from quarterly inspections. Our service contracts schedule and document everything for you.',
      },
      {
        q: 'Can you service oil-fired commercial boilers?',
        a: 'Yes — gas, oil, dual-fuel, and steam boilers from every major commercial manufacturer.',
      },
    ],
  },
  {
    slug: 'rooftop-units',
    name: 'Rooftop Unit (RTU) Service',
    segment: 'commercial',
    short:
      'RTU install, replacement, retrofit, and service for commercial roofs across North Jersey.',
    description:
      'Rooftop units are the workhorse of commercial HVAC, and we handle them at every stage of life — from sizing and crane-set on a new install to economizer retrofits, controls upgrades, and emergency repair on a 20-year-old York.',
    icon: 'Building',
    process: [
      {
        title: 'Site survey',
        description: 'Roof structural check, curb measurement, electrical and gas verification.',
      },
      {
        title: 'Equipment & curb adapter',
        description:
          'High-efficiency RTU spec, curb adapter engineered if existing curb is reused.',
      },
      {
        title: 'Crane lift & set',
        description: 'Coordinated lift with roofing contractor; minimal building disruption.',
      },
      {
        title: 'Commission & verify',
        description: 'Refrigerant charge, gas pressure, economizer commissioning, BAS integration.',
      },
    ],
    whatsIncluded: [
      'High-efficiency packaged RTUs (gas/electric, heat pump, dual-fuel)',
      'Engineered curb adapters',
      'Economizer commissioning per NJ energy code',
      'Demand-control ventilation (DCV)',
      'Smart-thermostat or BAS integration',
      'Crane scheduling and roofing coordination',
      'Permits and final inspection',
    ],
    faqs: [
      {
        q: 'Can you replace an RTU on a curb from a different manufacturer?',
        a: 'Yes — we engineer or order a curb adapter so the new unit lands cleanly on the existing penetration. No re-roofing required in most cases.',
      },
      {
        q: 'Do you handle the crane and roofing coordination?',
        a: 'Yes — one point of contact for the entire swap, including crane, roofing patch, electrical, gas, and inspection.',
      },
      {
        q: 'What if our roof structure cannot support a new RTU?',
        a: 'We pull in a structural engineer to evaluate and reinforce as needed. We do not punt that problem to the customer.',
      },
    ],
  },
  {
    slug: 'vrf-vrv-systems',
    name: 'VRF & VRV Systems',
    segment: 'commercial',
    short:
      'Daikin, Mitsubishi, and LG VRF/VRV design, install, and service for multi-zone commercial buildings.',
    description:
      'Variable Refrigerant Flow is the most flexible commercial HVAC platform available — zone-by-zone control, simultaneous heating and cooling, and best-in-class efficiency. We are factory-trained on all three major platforms and certified for branch-box and condenser commissioning.',
    icon: 'Wind',
    process: [
      {
        title: 'Zoning & load analysis',
        description: 'Zone-level Manual N or building energy model.',
      },
      {
        title: 'Refrigerant & piping design',
        description: 'Branch-box layout, line lengths verified against manufacturer tables.',
      },
      {
        title: 'Install & pressure test',
        description: 'Triple evacuation, nitrogen pressure test, manufacturer-approved brazing.',
      },
      {
        title: 'Commission & document',
        description:
          'Full system commissioning per manufacturer spec; controls programmed and trained.',
      },
    ],
    whatsIncluded: [
      'Single-phase and 3-phase VRF/VRV condensers',
      'Heat-recovery or heat-pump systems',
      'Branch controllers / branch boxes',
      'Wall, ceiling-cassette, ducted, and concealed indoor units',
      'Centralized and zone-level controls',
      'Manufacturer-required pressure testing and commissioning',
      'Extended-warranty registration',
    ],
    faqs: [
      {
        q: 'Why choose VRF/VRV over conventional commercial HVAC?',
        a: 'VRF gives you zone-by-zone control, ductless flexibility, simultaneous heating and cooling, and IEER ratings that beat conventional systems by 25–40%. Best fit for offices with varied occupancy, mixed-use buildings, and retrofits where ductwork is impractical.',
      },
      {
        q: 'Do you service existing VRF systems we did not install?',
        a: 'Yes. We are factory-certified on Daikin, Mitsubishi (City Multi), and LG (Multi V) and can take over service on existing systems.',
      },
      {
        q: 'Can VRF heat in cold New Jersey winters?',
        a: 'Yes — modern hyper-heat / heat-recovery VRF systems are rated for full heating capacity down to 5°F and operation to -13°F. We size for the worst-case design day.',
      },
    ],
  },
  {
    slug: 'chiller-service',
    name: 'Chiller Installation & Service',
    segment: 'commercial',
    short:
      'Air-cooled and water-cooled chiller install, repair, and annual service for commercial plants.',
    description:
      'Chillers are the heart of large commercial cooling, and they fail expensively when neglected. We install, repair, and maintain air-cooled and water-cooled chillers from 20 to 1,000+ tons, plus cooling towers, condenser-water pumps, and chemical treatment systems.',
    icon: 'Snowflake',
    process: [
      {
        title: 'Annual inspection or emergency response',
        description: 'Scheduled annual inspection or 24/7 emergency diagnostics.',
      },
      {
        title: 'Performance & oil analysis',
        description: 'Compressor oil sampling, eddy-current tube testing, log review.',
      },
      {
        title: 'Repair, retrofit, or replace',
        description:
          'Major repair, control retrofit, or full chiller replacement with TCO analysis.',
      },
      {
        title: 'Water treatment & commissioning',
        description: 'Condenser-water chemistry, tower service, full commissioning report.',
      },
    ],
    whatsIncluded: [
      'Air-cooled scroll, screw, and centrifugal chillers',
      'Water-cooled chillers and cooling towers',
      'Compressor rebuild and replacement',
      'Eddy-current tube testing',
      'Refrigerant management and EPA-compliant recovery',
      'Variable-frequency drive (VFD) retrofits',
      'Condenser-water chemical treatment',
    ],
    faqs: [
      {
        q: 'Do you handle low-pressure refrigerants (R-123, R-1233zd)?',
        a: 'Yes. EPA Section 608 Universal certification plus manufacturer-specific training on Trane, Carrier, York, and Daikin centrifugal platforms.',
      },
      {
        q: 'Can you take over an existing chiller plant?',
        a: 'Yes — we onboard with a baseline inspection, oil analysis, and log review, then build a customized PM schedule.',
      },
      {
        q: 'When does a chiller make sense vs. multiple smaller systems?',
        a: 'Usually when total cooling load exceeds ~80–100 tons or when a single chilled-water loop simplifies a complex building. We run the numbers in our proposal.',
      },
    ],
  },
  {
    slug: 'multi-family-hvac',
    name: 'Multi-Family HVAC',
    segment: 'commercial',
    short:
      'HVAC for apartment buildings, condos, and mixed-use — central plants, unit-level systems, and everything in between.',
    description:
      'Multi-family is its own animal — central boilers feeding 80 units, individual PTACs in a garden-style complex, tenant-by-tenant ductless retrofits in a condo association. We work with property managers, condo boards, and owner-occupants alike, with billing and reporting that fit each.',
    icon: 'Building2',
    process: [
      {
        title: 'Building & system audit',
        description: 'Central plant condition, unit-level equipment age, deferred maintenance log.',
      },
      {
        title: 'Capital plan or repair scope',
        description: 'Recommendations for board review, with capital and operating projections.',
      },
      {
        title: 'Phased work',
        description: 'Common-area and tenant-occupied work scheduled to minimize disruption.',
      },
      {
        title: 'Ongoing service contract',
        description: 'PM, priority dispatch, and consolidated billing for property managers.',
      },
    ],
    whatsIncluded: [
      'Central boiler plant install, repair, and PM',
      'Unit-by-unit furnace, AC, and ductless install',
      'PTAC and through-the-wall replacement',
      'Common-area HVAC and corridor ventilation',
      'Tenant work-order handling with on-call dispatch',
      'Annual safety, CO, and combustion certifications',
      'Capital-planning reports for boards and property managers',
    ],
    faqs: [
      {
        q: 'Do you bill property managers or individual unit owners?',
        a: 'Both. We can invoice the association, the building owner, or individual unit residents depending on the scope. Common-area work is billed to the association; unit-interior work can be billed to the resident.',
      },
      {
        q: 'Can you respond to tenant calls directly?',
        a: 'Yes. Property managers often give us a tenant hotline to call so we can triage and dispatch directly.',
      },
      {
        q: 'Do you handle capital-planning reports?',
        a: 'Yes — for condo boards and property managers we produce a written report on equipment condition, expected useful life, and capital recommendations.',
      },
    ],
  },
  {
    slug: 'commercial-maintenance',
    name: 'Commercial Preventive Maintenance',
    segment: 'commercial',
    short:
      'Quarterly and annual PM contracts with priority dispatch, written reports, and discounted repair labor.',
    description:
      'Commercial HVAC is too expensive to run reactively. Our preventive-maintenance contracts catch problems early, document compliance, extend equipment life, and put your account at the front of the line when something does fail.',
    icon: 'ShieldCheck',
    process: [
      {
        title: 'Onboarding inspection',
        description:
          'Baseline every piece of equipment, log model and serial numbers, document condition.',
      },
      {
        title: 'Custom PM schedule',
        description: 'Quarterly, semi-annual, or annual per equipment type and criticality.',
      },
      {
        title: 'Scheduled visits',
        description: 'Automatic scheduling — no chasing, no missed visits.',
      },
      {
        title: 'Written reports',
        description:
          'Every visit produces a written ticket; quarterly summary for management review.',
      },
    ],
    whatsIncluded: [
      'Customized PM schedule by equipment type',
      'Priority emergency dispatch with guaranteed response',
      '15–20% discount on all repair labor',
      'Combustion analysis and refrigerant logs',
      'Filter and belt inventory tracking',
      'Annual condition report and capital recommendations',
      'Consolidated monthly or quarterly billing',
    ],
    faqs: [
      {
        q: 'What is included in a typical PM visit?',
        a: 'Full inspection per equipment manufacturer spec: refrigerant readings, combustion analysis, electrical tightening, motor amp draw, drive and belt service, filter change, drain clearing, controls verification, and a written ticket.',
      },
      {
        q: 'Can you take over a contract from another vendor?',
        a: 'Yes — we onboard with a baseline inspection and pick up the PM schedule from where it left off.',
      },
      {
        q: 'Does the contract cover repair parts and labor?',
        a: 'Contracts include preventive maintenance, priority dispatch, and discounted repair labor. Full-coverage contracts that include repair parts and labor are available for larger accounts — quoted on application.',
      },
    ],
  },
  {
    slug: 'commercial-emergency-hvac',
    name: '24/7 Commercial Emergency Service',
    segment: 'commercial',
    short:
      'After-hours dispatch for commercial outages — restaurants, retail, warehouses, server rooms, and beyond.',
    description:
      'When a commercial system fails after hours, every minute matters. Our 24/7 commercial line is staffed by a real technician who can triage on the phone, dispatch the closest stocked truck, and have you back online before you open in the morning.',
    icon: 'Siren',
    process: [
      {
        title: 'Live call, any hour',
        description: 'A real commercial technician answers — never an answering service.',
      },
      {
        title: 'Phone triage',
        description:
          'Quick diagnostic over the phone often gets the system back online before we arrive.',
      },
      {
        title: 'Stocked-truck dispatch',
        description: 'Service-contract customers get a guaranteed response window.',
      },
      {
        title: 'Restore, document, follow up',
        description:
          'On-site repair, written service ticket, and a follow-up call the next business day.',
      },
    ],
    whatsIncluded: [
      '24/7/365 live dispatch',
      'Priority response for service-contract customers',
      'RTU, split, VRF, chiller, and boiler coverage',
      'Server-room and process-cooling dispatch',
      'Carbon monoxide and combustion safety verification',
      'Temporary rental units available for major outages',
    ],
    faqs: [
      {
        q: 'How fast can you respond after hours?',
        a: 'Service-contract customers get a guaranteed response window (typically 2 hours within our core area). Walk-up emergency calls are dispatched as crews and trucks allow — typically same-night.',
      },
      {
        q: 'Do you serve restaurants and retail with refrigeration too?',
        a: 'HVAC, hot-side gas equipment, and walk-in refrigeration HVAC tie-ins — yes. Direct refrigeration repair (walk-in compressors, ice machines) we coordinate with partner specialists when needed.',
      },
      {
        q: 'What if the building is unmanned?',
        a: 'We can hold a key, work with an access app, or coordinate with your security company. Many of our commercial accounts give us after-hours access by arrangement.',
      },
    ],
  },
  {
    slug: 'building-automation',
    name: 'Building Automation & Controls',
    segment: 'commercial',
    short:
      'BAS install, integration, retrofit, and tuning — Honeywell, Johnson, Pelican, and ecobee SmartBuildings.',
    description:
      'A modern commercial building runs on its controls. We install, retrofit, and tune building automation systems that cut energy bills, document compliance, and give facilities staff real visibility into what every piece of equipment is doing.',
    icon: 'Cog',
    process: [
      {
        title: 'Audit existing controls',
        description: 'Document current sequence of operations, identify gaps and quick wins.',
      },
      {
        title: 'Retrofit or new design',
        description: 'Open-protocol (BACnet) hardware spec, sequence development, alarm strategy.',
      },
      {
        title: 'Install & program',
        description: 'Field hardware, network, graphics, and trend logs.',
      },
      {
        title: 'Tune & train',
        description:
          'Live tuning under load, written sequence documentation, and operator training.',
      },
    ],
    whatsIncluded: [
      'BACnet/IP and BACnet/MSTP networks',
      'Honeywell, Johnson Controls, Pelican, ecobee SmartBuildings',
      'Sequence of operations development',
      'Energy dashboards and trending',
      'Demand-response and utility-rate-aware control',
      'Tenant- and zone-level scheduling',
      'Remote monitoring and alerting',
    ],
    faqs: [
      {
        q: 'Can you integrate with our existing BAS?',
        a: 'Yes — we work with open-protocol systems (BACnet, Modbus) and can integrate new equipment into existing front-ends, or replace a closed-protocol system in phases.',
      },
      {
        q: 'How much can good controls save us?',
        a: 'Typical commercial buildings see 10–25% energy savings from a properly tuned BAS. Demand-response participation can add to that.',
      },
      {
        q: 'Do you offer remote monitoring?',
        a: 'Yes — we can monitor critical commercial buildings 24/7 and alert your team and ours when something drifts out of spec.',
      },
    ],
  },
  {
    slug: 'commercial-ductwork',
    name: 'Commercial Ductwork & Sheet Metal',
    segment: 'commercial',
    short:
      'Custom duct fabrication, retrofits, kitchen exhaust, and ventilation upgrades for commercial spaces.',
    description:
      'Commercial HVAC lives or dies by the ductwork. We design, fabricate, and install commercial sheet metal in-house — including code-compliant kitchen exhaust, makeup air, lab and process exhaust, and general HVAC ducting.',
    icon: 'Wrench',
    process: [
      {
        title: 'Survey & airflow design',
        description: 'CFM targets, duct sizing per SMACNA / NFPA 96 where applicable.',
      },
      {
        title: 'In-house fabrication',
        description: 'Custom rectangular and spiral duct, fittings, and transitions.',
      },
      {
        title: 'Install & seal',
        description: 'SMACNA-leakage-class sealing, hangers, and supports to code.',
      },
      {
        title: 'Balance & verify',
        description: 'Test-and-balance report, CFM verification at every diffuser.',
      },
    ],
    whatsIncluded: [
      'Custom rectangular and spiral sheet-metal fabrication',
      'Commercial kitchen exhaust hoods and makeup air (NFPA 96)',
      'Lab, paint-booth, and process exhaust',
      'Smoke and fire-damper installation',
      'Duct insulation and acoustic lining',
      'SMACNA-compliant sealing and hangers',
      'Air balancing and verification reports',
    ],
    faqs: [
      {
        q: 'Do you fabricate in-house?',
        a: 'Yes — most ducting and fittings are fabricated in our shop, which controls quality and turnaround time on custom work.',
      },
      {
        q: 'Can you handle a commercial kitchen hood install?',
        a: 'Yes — full NFPA 96 compliant kitchen exhaust hood, ductwork, and makeup-air install, including grease-duct cleanouts and fire-suppression coordination.',
      },
      {
        q: 'Do you do test-and-balance?',
        a: 'Yes. Every commercial install ships with a TAB report showing CFM at every diffuser against design.',
      },
    ],
  },
];

export const RESIDENTIAL_SERVICES = SERVICES.filter((s) => s.segment === 'residential');
export const COMMERCIAL_SERVICES = SERVICES.filter((s) => s.segment === 'commercial');

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
      'Many Clifton homes still run on aging cast-iron steam or hot-water boilers — replacement with a modern condensing boiler typically cuts gas bills by 25–35%. Our techs know the original American Standard and Burnham systems backwards.',
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
      'Many Bloomfield homes near Watsessing Park were built before AC was standard. Ductless mini-splits are the cleanest way to add cooling without ripping plaster.',
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
      'Many Montclair homes cannot accept standard ductwork. Mini-duct (Unico) systems and ductless mini-splits are often the right call for both cooling and architectural preservation.',
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
      'Nutley capes and colonials frequently have cramped mechanical rooms. Wall-hung condensing boilers save floor space and run quieter than traditional cast-iron units.',
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
      'Older East Orange multi-family buildings often run on a single central boiler. Annual combustion analysis and safety checks are critical — we offer landlord service contracts for these.',
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

// Geographic centroids for each service area — used by JSON-LD Place/geo schema
// so search engines and AI answer engines can ground "near me" queries.
export const SERVICE_AREA_GEO: Record<string, { lat: number; lng: number; county: string }> = {
  Clifton: { lat: 40.8584, lng: -74.1638, county: 'Passaic County' },
  Passaic: { lat: 40.8568, lng: -74.1285, county: 'Passaic County' },
  Paterson: { lat: 40.9168, lng: -74.1718, county: 'Passaic County' },
  Wayne: { lat: 40.9255, lng: -74.2766, county: 'Passaic County' },
  Bloomfield: { lat: 40.806, lng: -74.1854, county: 'Essex County' },
  Montclair: { lat: 40.8259, lng: -74.209, county: 'Essex County' },
  Nutley: { lat: 40.822, lng: -74.16, county: 'Essex County' },
  'East Orange': { lat: 40.7673, lng: -74.2049, county: 'Essex County' },
  'Little Falls': { lat: 40.8687, lng: -74.2087, county: 'Passaic County' },
  Totowa: { lat: 40.9051, lng: -74.2154, county: 'Passaic County' },
  Lodi: { lat: 40.8793, lng: -74.0832, county: 'Bergen County' },
  Garfield: { lat: 40.8815, lng: -74.1129, county: 'Bergen County' },
  Hackensack: { lat: 40.886, lng: -74.0435, county: 'Bergen County' },
  Paramus: { lat: 40.9445, lng: -74.0754, county: 'Bergen County' },
};

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
    text: 'Our boiler died on the coldest night of the year. P&P picked up the phone at 11 p.m., had a tech here by midnight, and a new high-efficiency unit installed two days later. Pricing was clear, the crew was respectful, and the heat has not blinked since. They have a customer for life.',
  },
  {
    name: 'David K.',
    city: 'Montclair, NJ',
    rating: 5,
    text: 'We had three other companies quote us on central AC for our 1920s house and every one of them wanted to rip out plaster. P&P proposed a Unico high-velocity system instead — quieter, cleaner, and we kept every wall intact. The owner was on-site for the final walkthrough. Genuinely impressive operation.',
  },
  {
    name: 'James and Liz P.',
    city: 'Wayne, NJ',
    rating: 5,
    text: 'Same-day AC repair in the middle of a heat wave — they were here within 90 minutes, diagnosed a failed capacitor, and had it fixed for a flat fee, no hourly games. We signed up for their Comfort Club afterwards. Cannot recommend them enough.',
  },
];

export const SERVICE_AREA_CITIES = ALL_SERVICE_AREAS;

// Authors — used for blog post bylines and JSON-LD `Person` schema (E-E-A-T).
export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  yearsExperience: number;
  credentials: string[];
};

export const AUTHORS: Record<string, Author> = {
  'pp-mechanical': {
    slug: 'pp-mechanical',
    name: 'P&P Mechanical',
    role: 'NJ Licensed HVAC & Boiler Specialists',
    bio: 'The technicians at P&P Mechanical install, repair, and service HVAC and boiler systems across Clifton, Passaic, Paterson, and the surrounding North Jersey region. Every post is reviewed by an NJ-licensed master HVACR contractor before publication.',
    yearsExperience: new Date().getFullYear() - BUSINESS.founded,
    credentials: [
      'NJ HVACR Contractor License',
      'EPA Section 608 Certified',
      'Factory-trained on Carrier, Trane, Lennox, Navien, Mitsubishi',
    ],
  },
};

// Public reviews — used by Review JSON-LD and on-page testimonial schema.
// Add new entries with publication-quality language; date is ISO yyyy-mm-dd.
export type Review = {
  author: string;
  city: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  text: string;
};

export const REVIEWS: Review[] = [
  {
    author: 'Maria R.',
    city: 'Clifton, NJ',
    rating: 5,
    date: '2025-01-18',
    text: 'Our boiler died on the coldest night of the year. P&P picked up the phone at 11 p.m., had a tech here by midnight, and a new high-efficiency unit installed two days later. Pricing was clear, the crew respectful, and the heat has not blinked since.',
  },
  {
    author: 'David K.',
    city: 'Montclair, NJ',
    rating: 5,
    date: '2024-08-22',
    text: 'Three other companies wanted to rip out plaster to install central AC in our 1920s house. P&P proposed a Unico high-velocity system instead — quieter, cleaner, every wall intact. The owner was on-site for the final walkthrough.',
  },
  {
    author: 'James and Liz P.',
    city: 'Wayne, NJ',
    rating: 5,
    date: '2024-07-14',
    text: 'Same-day AC repair in the middle of a heat wave — they were here within 90 minutes, diagnosed a failed capacitor, fixed it for a flat fee, no hourly games. We signed up for their Comfort Club afterwards.',
  },
  {
    author: 'Tom B.',
    city: 'Passaic, NJ',
    rating: 5,
    date: '2024-11-02',
    text: 'P&P replaced our 1970s cast-iron boiler with a sealed-combustion Navien. Gas bill dropped 32% the first winter. They handled the PSE&G coordination and the city permits without us lifting a finger.',
  },
  {
    author: 'Aisha N.',
    city: 'Bloomfield, NJ',
    rating: 5,
    date: '2024-09-30',
    text: 'Honest diagnosis on an old AC. Other guys quoted $1,800 for a repair; P&P found a $240 capacitor was the actual culprit. They earned a long-term customer with that one visit.',
  },
  {
    author: 'Carlos M.',
    city: 'Paterson, NJ',
    rating: 5,
    date: '2025-02-11',
    text: 'Manage a four-unit rental building and P&P keeps every system running. Priority dispatch with the Comfort Club has saved me dozens of midnight tenant calls.',
  },
  {
    author: 'Rachel S.',
    city: 'Nutley, NJ',
    rating: 5,
    date: '2024-12-05',
    text: 'Ductless mini-split install on a 1940s cape. Clean cuts, hidden line sets, no mess. The lead installer walked me through the controls and the rebate paperwork.',
  },
  {
    author: 'Greg D.',
    city: 'Wayne, NJ',
    rating: 5,
    date: '2024-06-19',
    text: 'New 18 SEER2 central AC for a 2,400 sqft colonial. Manual J done properly, second return added to fix the airflow imbalance the previous installer left us with. Worth every penny.',
  },
];

// General FAQs — combined with per-service FAQs on the /faq hub page.
export const GENERAL_FAQS: { q: string; a: string; category: string }[] = [
  {
    category: 'Pricing',
    q: 'Do you charge for estimates on HVAC or boiler installation?',
    a: 'No. Estimates for new HVAC, boiler, AC, and ductless installations in Clifton and the surrounding service area are always free. We diagnose, measure, and put a firm flat-rate price in writing before any work begins.',
  },
  {
    category: 'Pricing',
    q: 'How much does a diagnostic service call cost?',
    a: 'Our standard residential diagnostic is $89 and is credited toward any approved repair of $300 or more. After-hours emergency dispatch is $150 on top of the diagnostic, waived on repairs of $600+.',
  },
  {
    category: 'Pricing',
    q: 'Do you offer financing on new systems?',
    a: 'Yes. We partner with Wisetack and Synchrony to offer 0%–9.99% APR on approved credit, with terms from 12 to 84 months on most installations.',
  },
  {
    category: 'Service Area',
    q: 'What towns do you service in North Jersey?',
    a: 'We dispatch from Clifton and cover all of Passaic County (Clifton, Passaic, Paterson, Wayne, Totowa, Little Falls), most of Essex County (Bloomfield, Montclair, Nutley, East Orange), and the closer Bergen County towns (Lodi, Garfield, Hackensack, Paramus). If you are not sure whether we cover your town, call us.',
  },
  {
    category: 'Service Area',
    q: 'Do you handle commercial HVAC work?',
    a: 'Yes — full-service commercial HVAC at any scale. Rooftop units, VRF/VRV, chillers, commercial boilers, multi-family buildings, building automation, and 24/7 emergency dispatch. See /commercial for the full lineup. We carry $2M general liability and offer service contracts with priority dispatch.',
  },
  {
    category: 'Emergency',
    q: 'Is your 24/7 emergency line really 24/7?',
    a: 'Yes. A real technician — not an answering service — picks up the phone at any hour, every day of the year. Typical after-hours arrival is under 2 hours within our core service area.',
  },
  {
    category: 'Emergency',
    q: 'What should I do if I smell gas?',
    a: 'Leave the building immediately, call PSE&G (1-800-880-7734) or your utility, then call us once the area is safe. Do not flip light switches or operate appliances on your way out.',
  },
  {
    category: 'Emergency',
    q: 'My carbon monoxide alarm went off — is that an HVAC emergency?',
    a: 'Yes. Evacuate the home, call 911, ventilate the space once everyone is out, and call us. Common HVAC causes are a cracked heat exchanger, blocked flue, or improperly venting boiler — every one is a same-day repair.',
  },
  {
    category: 'Equipment',
    q: 'How long does a typical HVAC system last in New Jersey?',
    a: 'With annual maintenance, gas furnaces last 18–22 years, central AC 12–17 years, condensing boilers 15–20 years, and ductless mini-splits 15–20 years. Coastal humidity and skipped tune-ups can cut those figures by 25%.',
  },
  {
    category: 'Equipment',
    q: 'Should I repair or replace my old system?',
    a: 'A useful rule: if the repair cost is more than 30% of replacement cost on a system over 12 years old, replacement usually pays back inside 4 years on energy savings alone. We give you both numbers in writing and let you choose.',
  },
  {
    category: 'Equipment',
    q: 'What HVAC brands do you install?',
    a: 'We are factory-trained on Carrier, Trane, Lennox, Bosch, Goodman, Mitsubishi (ductless), Navien, Weil-McLain, Buderus, and Burnham. We recommend equipment based on your home, budget, and efficiency goals — never to hit a brand quota.',
  },
  {
    category: 'Permits & Rebates',
    q: 'Do you pull permits with the city?',
    a: 'Yes — we pull all mechanical, electrical, and (when needed) plumbing permits ourselves, schedule the municipal inspection, and meet the inspector on site. The cost is included in our quote.',
  },
  {
    category: 'Permits & Rebates',
    q: 'Are there rebates available for high-efficiency equipment in NJ?',
    a: 'Yes. NJ Clean Energy and most utilities offer $300–$1,200 rebates on qualifying high-efficiency boilers, furnaces, central AC, and heat pumps. Federal IRA tax credits add up to $2,000 for qualifying heat pump installs. We handle the rebate paperwork for you.',
  },
  {
    category: 'Maintenance',
    q: 'How often should HVAC equipment be serviced?',
    a: 'Annually, at minimum — heating equipment in the fall, AC in the spring. Annual tune-ups extend equipment life by 3–5 years, preserve manufacturer warranties, and catch small problems before they become emergencies.',
  },
  {
    category: 'Maintenance',
    q: 'What does an HVAC tune-up include?',
    a: 'A full 21-point inspection: combustion test, refrigerant pressure and temperature, electrical tightening, capacitor and contactor test, blower amp draw, drain line clearing, condensate pan flush, thermostat calibration, and a written health report.',
  },
];
