'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reveals children when they scroll into view, using a single
 * IntersectionObserver and CSS transitions. Lightweight replacement for
 * Framer Motion's `whileInView` so the homepage no longer ships the library.
 */
export function useInViewOnce<T extends Element>(amount = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: amount },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [amount, inView]);

  return { ref, inView };
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Direction of the entrance, matching the previous Framer transitions. */
  variant?: 'up' | 'left' | 'scale';
  /** Stagger delay in seconds. */
  delay?: number;
  amount?: number;
  as?: ElementType;
};

export function Reveal({
  children,
  className,
  variant = 'up',
  delay = 0,
  amount = 0.2,
  as: Tag = 'div',
}: RevealProps) {
  const { ref, inView } = useInViewOnce<HTMLElement>(amount);
  const variantClass =
    variant === 'left' ? 'reveal-left' : variant === 'scale' ? 'reveal-scale' : 'reveal-up';

  return (
    <Tag
      ref={ref}
      data-show={inView ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      className={cn('reveal', variantClass, className)}
    >
      {children}
    </Tag>
  );
}
