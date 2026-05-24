import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Phone, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Thank You',
  description: 'Your request has been received. A P&P Mechanical team member will reach out shortly.',
  robots: { index: false, follow: true },
};

export default function ThankYouPage() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-tight text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-ember-500/15 ring-2 ring-ember-500/40">
          <CheckCircle2 className="h-10 w-10 text-ember-300" />
        </div>
        <h1 className="heading-display text-balance">Thanks — we got it.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-steel-100">
          A P&amp;P Mechanical team member will reach out within <strong className="text-white">2 hours</strong> during
          business hours, or first thing in the morning if you submitted overnight.
        </p>

        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-left">
            <Clock className="mb-3 h-5 w-5 text-ember-400" />
            <p className="font-display text-lg text-white">What happens next</p>
            <p className="mt-1 text-sm text-steel-200">
              A real person calls — not a robot. We confirm details, schedule the visit, and (if relevant) text you a tech ETA.
            </p>
          </div>
          <div className="rounded-xl border border-ember-500/40 bg-ember-500/10 p-6 text-left">
            <Phone className="mb-3 h-5 w-5 text-ember-300" />
            <p className="font-display text-lg text-white">Have an emergency?</p>
            <p className="mt-1 text-sm text-ember-100">
              Don&apos;t wait — call our 24/7 line:{' '}
              <a href={BUSINESS.phoneHref} className="font-bold underline">{BUSINESS.phone}</a>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="primary">
            <Link href="/blog">
              Read HVAC tips for NJ <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
