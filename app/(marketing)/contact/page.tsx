import type { Metadata } from 'next';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';
import { ContactForm } from '@/components/forms/ContactForm';
import { BreadcrumbSchema, LocalBusinessSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with P&P Mechanical for HVAC, boiler, and AC service across Clifton, NJ and the surrounding North Jersey region. 24/7 emergency line available.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <LocalBusinessSchema />
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Contact', href: '/contact' }]} />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">Contact</span>
          <h1 className="heading-display max-w-3xl text-balance">
            Talk to us. A real person will pick up.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            Use the form for non-urgent quotes and questions. For HVAC emergencies — no heat, no AC, a gas smell,
            a CO alarm — call us directly. We dispatch 24/7.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-wide grid gap-12 lg:grid-cols-3">
          <aside className="space-y-5 lg:col-span-1">
            <ContactCard
              icon={<Phone className="h-5 w-5 text-ember-400" />}
              title="Phone"
              body={
                <a href={BUSINESS.phoneHref} className="text-white hover:text-ember-300">
                  {BUSINESS.phone}
                </a>
              }
              note="24/7 emergency line"
            />
            <ContactCard
              icon={<Mail className="h-5 w-5 text-ember-400" />}
              title="Email"
              body={
                <a href={`mailto:${BUSINESS.email}`} className="text-white hover:text-ember-300">
                  {BUSINESS.email}
                </a>
              }
              note="Replies within one business day"
            />
            <ContactCard
              icon={<MapPin className="h-5 w-5 text-ember-400" />}
              title="Address"
              body={
                <>
                  {BUSINESS.address.street}
                  <br />
                  {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
                </>
              }
              note="Dispatch + office"
            />
            <ContactCard
              icon={<Clock className="h-5 w-5 text-ember-400" />}
              title="Hours"
              body="Mon–Sun, 24 hours"
              note="Live phone dispatch around the clock"
            />
          </aside>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 lg:col-span-2">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}

function ContactCard({
  icon, title, body, note,
}: { icon: React.ReactNode; title: string; body: React.ReactNode; note: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-xs font-bold uppercase tracking-widest text-ember-300">{title}</h2>
      </div>
      <div className="mt-2 font-display text-lg text-white">{body}</div>
      <p className="mt-1 text-xs text-steel-300">{note}</p>
    </div>
  );
}
