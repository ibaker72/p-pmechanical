'use client';

import { useReportWebVitals } from 'next/web-vitals';

// Reports Core Web Vitals (CLS, FCP, FID/INP, LCP, TTFB) to /api/vitals via
// sendBeacon so it never blocks navigation. Vercel Speed Insights still
// collects its own metrics in parallel — this is just an open-source backup.
export function WebVitals() {
  useReportWebVitals((metric) => {
    try {
      const body = JSON.stringify(metric);
      const url = '/api/vitals';
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, {
          body,
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // never break the page over telemetry
    }
  });
  return null;
}
