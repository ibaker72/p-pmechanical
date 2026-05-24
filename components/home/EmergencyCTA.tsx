import Link from 'next/link';
import { Phone, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants';

export function EmergencyCTA() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ember-700 via-ember-600 to-ember-800" />
      <div aria-hidden className="absolute inset-0 bg-grid-faint bg-[length:48px_48px] opacity-20" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30" />

      <div className="container-wide relative py-16 sm:py-20">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex items-start gap-5">
            <Siren className="h-12 w-12 shrink-0 text-white drop-shadow-lg" aria-hidden />
            <div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white text-balance">
                HVAC Emergency? We&apos;re available 24/7.
              </h2>
              <p className="mt-2 max-w-2xl text-base sm:text-lg text-white/90">
                A real person answers — any hour, any day. Stocked trucks dispatched immediately.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="dark" className="bg-ink-950 hover:bg-ink-900">
              <a href={BUSINESS.phoneHref}>
                <Phone className="h-4 w-4" /> Call {BUSINESS.phone}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              <Link href="/quote">Request Online</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
