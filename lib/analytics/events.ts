// Named conversion-event helpers. Thin wrappers over lib/analytics.ts's
// trackEvent, which is itself a safe no-op when Vercel Analytics is not
// configured. Use these from client components on CTA interactions.

import { trackEvent } from '@/lib/analytics';

export function trackPhoneClick(source?: string) {
  trackEvent('phone_click', source ? { source } : undefined);
}

export function trackQuoteSubmit(source?: string) {
  trackEvent('quote_submit', source ? { source } : undefined);
}

export function trackEmergencyClick(source?: string) {
  trackEvent('emergency_cta_click', source ? { source } : undefined);
}

export function trackServiceCta(service: string) {
  trackEvent('service_cta_click', { service });
}

export function trackCityCta(city: string) {
  trackEvent('city_cta_click', { city });
}
