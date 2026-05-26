'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ThermometerSnowflake, Flame, Wrench, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OPTIONS = [
  {
    href: '/services/emergency-hvac',
    title: 'No heat / no cooling',
    description: 'System down completely? Get same-day or 24/7 emergency dispatch.',
    icon: ThermometerSnowflake,
  },
  {
    href: '/services/boiler-repair',
    title: 'Boiler or furnace issue',
    description: 'Strange noises, leaks, or rising gas bills — we diagnose and fix it.',
    icon: Flame,
  },
  {
    href: '/services/hvac-installation',
    title: 'New install or replacement',
    description: 'Aging equipment or a new build? We size it right with a free estimate.',
    icon: Wrench,
  },
];

export function HelpChooser() {
  return (
    <section className="relative bg-ink-900/50 py-24 sm:py-32">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow mb-4">Where to Start</span>
          <h2 className="heading-section text-balance">
            Not sure what you need? We&apos;ll point you in the right direction.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-steel-200">
            Tell us what&apos;s going on with your system and we&apos;ll help you decide whether it
            needs repair, replacement, or emergency service.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {OPTIONS.map((opt, i) => (
            <motion.div
              key={opt.href}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Link
                href={opt.href}
                className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/50 hover:shadow-ember"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/10 ring-1 ring-ember-500/30 transition-colors group-hover:bg-ember-500/20">
                  <opt.icon className="h-6 w-6 text-ember-400" />
                </div>
                <h3 className="mb-2 font-display text-2xl text-white">{opt.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-steel-200">{opt.description}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                  Get Help
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" variant="primary">
            <Link href="/quote">Request a Free Estimate</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
