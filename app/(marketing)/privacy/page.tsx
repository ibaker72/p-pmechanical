import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${BUSINESS.name}.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-tight prose-pp">
        <h1 className="heading-display">Privacy Policy</h1>
        <p>
          {BUSINESS.name} (&quot;we&quot;) respects your privacy. This page explains what we collect and how we use it.
        </p>
        <h2>What we collect</h2>
        <p>
          When you submit a form on this website (contact, quote wizard, savings guide, etc.), we collect the
          information you provide — name, email, phone, message, and basic project details.
        </p>
        <h2>How we use it</h2>
        <p>
          We use your information solely to respond to your service inquiry and, if you opted in, to send you HVAC
          tips and seasonal reminders. We never sell or rent your contact information.
        </p>
        <h2>Email opt-out</h2>
        <p>Every marketing email contains a one-click unsubscribe link.</p>
        <h2>Cookies</h2>
        <p>
          We use only essential cookies required for the site to function (e.g., session management). We do not use
          third-party advertising cookies on this site at this time.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about this policy? Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
        </p>
      </div>
    </section>
  );
}
