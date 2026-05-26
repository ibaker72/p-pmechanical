'use client';

import { useEffect, useState } from 'react';
import { Reveal, useInViewOnce } from '@/components/ui/Reveal';

type Stat = {
  value: number;
  suffix?: string;
  label: string;
  decimal?: boolean;
  raw?: boolean;
};

const STATS: Stat[] = [
  { value: 500, suffix: '+', label: 'Jobs Completed' },
  { value: 4.9, suffix: '★', label: 'Average Rating', decimal: true },
  { value: 2021, suffix: '', label: 'Serving NJ Since', raw: true },
  { value: 24, suffix: '/7', label: 'Emergency Service' },
];

function Counter({ stat }: { stat: Stat }) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(0.5);
  const [val, setVal] = useState(stat.raw ? stat.value : 0);

  useEffect(() => {
    if (!inView || stat.raw) return;
    const duration = 1500;
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(stat.value * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, stat]);

  const display = stat.raw
    ? stat.value.toString()
    : stat.decimal
      ? val.toFixed(1)
      : Math.round(val).toString();

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {stat.suffix}
    </span>
  );
}

export function StatsBar() {
  return (
    <section className="relative z-10 -mt-12">
      <div className="container-wide">
        <Reveal
          variant="up"
          amount={0.3}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-ink-900/60 px-6 py-8 text-center">
              <div className="font-display text-4xl text-white sm:text-5xl">
                <Counter stat={stat} />
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-ember-300">
                {stat.label}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
