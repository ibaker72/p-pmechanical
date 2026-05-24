'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

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
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
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
    <section className="relative -mt-12 z-10">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-ink-900/60 px-6 py-8 text-center"
            >
              <div className="font-display text-4xl sm:text-5xl text-white">
                <Counter stat={stat} />
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-ember-300">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
