'use client';

import { Phone, MessageSquare } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

const SMS_HREF = `sms:${BUSINESS.phoneHref.replace('tel:', '')}?&body=${encodeURIComponent(
  "Hi, I'd like a quote for HVAC service.",
)}`;

export function StickyMobileCTA() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <a
        href={BUSINESS.phoneHref}
        aria-label="Tap to call 24/7 dispatch"
        data-cta="sticky-mobile-call"
        className="flex flex-1 items-center justify-center gap-2 bg-ember-500 py-4 text-base font-bold uppercase tracking-wider text-ink-950 shadow-[0_-8px_24px_-8px_rgba(249,115,22,0.55)] transition-colors hover:bg-ember-400 active:bg-ember-600"
      >
        <Phone className="h-5 w-5" strokeWidth={2.5} />
        Call 24/7
      </a>
      <a
        href={SMS_HREF}
        aria-label="Text us for a quote"
        data-cta="sticky-mobile-text"
        className="flex flex-1 items-center justify-center gap-2 border-l border-ink-950/20 bg-ink-900 py-4 text-base font-bold uppercase tracking-wider text-white shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/10 transition-colors hover:bg-ink-800 active:bg-ink-950"
      >
        <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
        Text Us
      </a>
    </div>
  );
}
