import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Award, Users, Wrench, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants';
import { BreadcrumbSchema, LocalBusinessSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: `About ${BUSINESS.name}`,
  description:
    'P&P Mechanical LLC is a family-grown HVAC, boiler, and AC contractor based in Clifton, NJ. Founded in 2021 with a mission to raise the standard of HVAC craftsmanship across North Jersey.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  { icon: Wrench, title: 'Craftsmanship', body: 'Every install is one we would sign our name on the back of.' },
  { icon: Heart, title: 'Honesty', body: 'Upfront flat-rate pricing. Real diagnoses. No commission-pressured sales.' },
  { icon: Users, title: 'Service', body: 'A real person on the phone, every hour of every day.' },
  { icon: Award, title: 'Standards', body: 'EPA, NJ-licensed, and factory-trained on every major brand we install.' },
];

export default function AboutPage() {
  return (
    <>
      <LocalBusinessSchema />
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'About', href: '/about' }]} />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">About</span>
          <h1 className="heading-display max-w-3xl text-balance">
            We started P&amp;P Mechanical because NJ deserved better HVAC.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            We grew up in Clifton, learned the trade in basements across Passaic County, and got tired of watching
            homeowners get talked into the wrong equipment by big-box installers running commission quotas.
            So in 2021, we built our own shop — small enough to know every customer&apos;s name, serious enough
            to compete on craftsmanship with anyone in the state.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-wide grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80"
              alt="HVAC technician at work"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
          </div>
          <div>
            <span className="eyebrow mb-4">Our Story</span>
            <h2 className="heading-section text-balance">A small shop with a big standard.</h2>
            <div className="prose-pp mt-5">
              <p>
                We opened the doors in 2021 with two trucks, a phone, and a promise: every system we touch leaves
                the home cleaner and quieter than we found it. We do not chase volume. We do not employ
                commissioned salespeople. We do not say yes to work we cannot do exceptionally well.
              </p>
              <p>
                What we do — and what we are good at — is HVAC done the right way. Manual J load calculations.
                Sealed-combustion venting. Refrigerant charged by weight. Clean, code-compliant near-boiler piping.
                The kind of work that lasts twenty years instead of twelve.
              </p>
              <p>
                If you want HVAC done by people who treat your home the way they treat their own, you are in the
                right place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-ink-900/40 py-20 sm:py-24">
        <div className="container-wide">
          <div className="mb-12 max-w-2xl">
            <span className="eyebrow mb-4">What we stand for</span>
            <h2 className="heading-section text-balance">Four principles. No exceptions.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-ember-500/10 ring-1 ring-ember-500/30">
                  <v.icon className="h-5 w-5 text-ember-400" />
                </div>
                <h3 className="font-display text-xl text-white">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-200">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-tight text-center">
          <h2 className="heading-section text-balance">
            Ready to work with a shop that actually shows up?
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="primary">
              <Link href="/quote">Get a Free Quote</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
