'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Snowflake, Wind, Flame, Siren, ShieldCheck, Building2, ArrowUpRight } from 'lucide-react';

const CARDS = [
  {
    href: '/services/ac-installation',
    title: 'AC Installation',
    description: 'High-efficiency central air & ductless mini-splits, sized right.',
    icon: Snowflake,
  },
  {
    href: '/services/ac-repair',
    title: 'AC Repair',
    description: 'Same-day diagnosis and repair when the temperature climbs.',
    icon: Wind,
  },
  {
    href: '/services/boiler-installation',
    title: 'Heating & Boilers',
    description: 'Modern condensing boilers and furnaces that cut your gas bill.',
    icon: Flame,
  },
  {
    href: '/services/emergency-hvac',
    title: 'Emergency Service',
    description: '24/7 live dispatch — a real person, not a robot.',
    icon: Siren,
  },
  {
    href: '/services/maintenance-plans',
    title: 'Maintenance Plans',
    description: 'Tune-ups, priority service, and 15% off every repair.',
    icon: ShieldCheck,
  },
  {
    href: '/services/hvac-installation',
    title: 'New Construction',
    description: 'Whole-house HVAC design for builders and renovators.',
    icon: Building2,
  },
  {
    href: '/commercial',
    title: 'Commercial HVAC',
    description: 'Full-service commercial — RTUs, VRF, chillers, boilers, BAS. At any scale.',
    icon: Building2,
  },
];

export function ServicesGrid() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <span className="eyebrow mb-4">What We Do</span>
          <h2 className="heading-section text-balance">
            Every HVAC service North Jersey homes and businesses will ever need — under one roof.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Link
                href={card.href}
                className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/50 hover:shadow-ember"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/10 ring-1 ring-ember-500/30 transition-colors group-hover:bg-ember-500/20">
                  <card.icon className="h-6 w-6 text-ember-400" />
                </div>
                <h3 className="mb-2 font-display text-2xl text-white">{card.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-steel-200">{card.description}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                  Learn More
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
