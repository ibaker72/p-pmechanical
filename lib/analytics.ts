// Thin client-side wrapper around Vercel Analytics' `track()`. Always safe to
// call — if Vercel Analytics is not enabled or `track` throws, we no-op.

import { track as vercelTrack } from '@vercel/analytics';

export type LeadEvent = {
  source: string;
  service_type?: string;
  city?: string;
};

export function trackLead(event: LeadEvent) {
  try {
    vercelTrack('lead_submitted', { ...event });
  } catch {
    // analytics must never break a form
  }
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean | null>) {
  try {
    vercelTrack(name, props);
  } catch {
    // ignore
  }
}
