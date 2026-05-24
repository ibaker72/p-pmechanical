'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, ShieldCheck, Clock, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants';

const badges = [
  { icon: ShieldCheck, label: 'Licensed & Insured' },
  { icon: Clock, label: 'Same-Day Service' },
  { icon: FileText, label: 'Free Estimates' },
  { icon: CreditCard, label: 'Financing Available' },
];

export function Hero() {
  return (
    <section className="heat-shimmer relative isolate overflow-hidden bg-hero-noise">
      {/* Grid overlay */}
      <div
        aria-hidden
        className="mask-fade-b absolute inset-0 bg-grid-faint bg-[length:64px_64px] opacity-30"
      />
      {/* Particles */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-ember-400/40"
            style={{
              left: `${(i * 73) % 100}%`,
              top: `${(i * 41) % 100}%`,
              animation: `float ${6 + (i % 5)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="container-wide relative pb-24 pt-20 lg:pb-32 lg:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <span className="eyebrow mb-6">Clifton · Passaic · Paterson · North Jersey</span>
          <h1 className="heading-display text-shadow-hero text-balance">
            North Jersey&apos;s
            <span className="block bg-ember-gradient bg-clip-text text-transparent">
              Premier HVAC & Boiler Specialists
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-steel-100 sm:text-xl">
            Residential &amp; commercial — installation, repair, and 24/7 emergency dispatch across
            Clifton, Passaic County, and surrounding areas. Licensed, insured, and committed to the
            kind of craftsmanship most HVAC contractors forgot how to deliver.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" variant="primary">
              <Link href="/quote">Get a Free Quote</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={BUSINESS.phoneHref} className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Call {BUSINESS.phone}
              </a>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {badges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-medium text-steel-100"
              >
                <Icon className="h-4 w-4 text-ember-400" />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-950" />
    </section>
  );
}
