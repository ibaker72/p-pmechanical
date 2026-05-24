'use client';

import { Phone } from 'lucide-react';

const DISPATCH_PHONE_HREF = 'tel:+12014565151';

export function StickyMobileCTA() {
  return (
    <a
      href={DISPATCH_PHONE_HREF}
      aria-label="Tap to call 24/7 dispatch"
      data-cta="sticky-mobile-call"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-ember-500 px-4 py-4 text-base font-bold uppercase tracking-wider text-ink-950 shadow-[0_-8px_24px_-8px_rgba(249,115,22,0.55)] ring-1 ring-ember-400/60 transition-colors hover:bg-ember-400 active:bg-ember-600 md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/15 ring-1 ring-ink-950/25">
        <Phone className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span>Tap to Call 24/7 Dispatch</span>
    </a>
  );
}
