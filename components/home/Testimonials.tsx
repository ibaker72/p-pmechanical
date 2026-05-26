'use client';

import { useEffect, useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { TESTIMONIALS, BUSINESS } from '@/lib/constants';

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % TESTIMONIALS.length), 6500);
    return () => clearInterval(id);
  }, [paused]);

  const t = TESTIMONIALS[active];

  return (
    <section
      className="relative bg-ink-900/50 py-24 sm:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container-tight">
        <div className="mb-12 text-center">
          <span className="eyebrow mb-4 justify-center">Testimonials</span>
          <h2 className="heading-section">What our customers say</h2>
        </div>

        <div className="relative mx-auto max-w-3xl">
          <Quote aria-hidden className="absolute -top-6 left-0 h-16 w-16 text-ember-500/20" />
          <div className="min-h-[260px]">
            <blockquote
              key={active}
              className="animate-testimonial-in rounded-2xl border border-white/10 bg-white/[0.03] p-8 sm:p-12"
            >
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-ember-400 text-ember-400" />
                ))}
              </div>
              <p className="font-display text-2xl leading-snug text-white sm:text-3xl">
                &ldquo;{t.text}&rdquo;
              </p>
              <footer className="mt-6 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{t.name}</div>
                  <div className="text-sm text-steel-300">{t.city}</div>
                </div>
                <div className="hidden text-xs font-bold uppercase tracking-widest text-ember-400 sm:block">
                  Verified Customer
                </div>
              </footer>
            </blockquote>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? 'w-10 bg-ember-400' : 'w-4 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setActive((a) => (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
                }
                aria-label="Previous testimonial"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:border-ember-400 hover:text-ember-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActive((a) => (a + 1) % TESTIMONIALS.length)}
                aria-label="Next testimonial"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:border-ember-400 hover:text-ember-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href={BUSINESS.social.google}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-ember-300 underline decoration-ember-500/40 underline-offset-4 hover:text-ember-200"
            >
              Read more on Google →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
