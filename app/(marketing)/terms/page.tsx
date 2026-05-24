import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of service for ${BUSINESS.name}.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-tight prose-pp">
        <h1 className="heading-display">Terms of Service</h1>
        <p>
          By using this website, you agree to these terms. The content on this site is provided for informational
          purposes. Pricing, availability, and service area are subject to change.
        </p>
        <h2>Service quotes</h2>
        <p>
          Quotes generated through this website are estimates. A binding price is provided in writing after an
          on-site visit and inspection.
        </p>
        <h2>Emergency dispatch</h2>
        <p>
          24/7 emergency dispatch is best-effort and depends on call volume and weather conditions. We always
          recommend calling our line directly for time-sensitive emergencies.
        </p>
        <h2>Limitation of liability</h2>
        <p>
          {BUSINESS.name} is not liable for damages arising from the use of this website. All HVAC work is governed
          by the written work agreement signed at time of service.
        </p>
        <h2>Contact</h2>
        <p>Questions? Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</p>
      </div>
    </section>
  );
}
