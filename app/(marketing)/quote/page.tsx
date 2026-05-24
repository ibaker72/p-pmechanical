import type { Metadata } from 'next';
import { QuoteWizard } from '@/components/forms/QuoteWizard';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Get a Free HVAC Quote',
  description:
    'Four quick steps and a real human will call you back within 2 hours with a free, no-pressure HVAC quote across Clifton, NJ and surrounding North Jersey towns.',
  alternates: { canonical: '/quote' },
};

export default function QuotePage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Get a Quote', href: '/quote' }]} />

      <section className="border-b border-white/10 py-20 sm:py-24">
        <div className="container-tight text-center">
          <span className="eyebrow justify-center mb-5">Instant Quote</span>
          <h1 className="heading-display text-balance">
            Get a free quote in 60 seconds.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-steel-200">
            Four quick questions, then we&apos;ll call you back within 2 hours with next steps.
            No bots, no spam, no sales pressure.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-wide">
          <QuoteWizard />
        </div>
      </section>
    </>
  );
}
