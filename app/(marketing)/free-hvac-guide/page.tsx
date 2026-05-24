import type { Metadata } from 'next';
import { FileDown, Check } from 'lucide-react';
import { LeadMagnetForm } from '@/components/forms/LeadMagnetForm';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Free NJ Homeowner HVAC Savings Guide',
  description:
    'Download the free NJ Homeowner HVAC Savings Guide — 12 ways to cut your energy bill, written by P&P Mechanical for North Jersey homes.',
  alternates: { canonical: '/free-hvac-guide' },
};

const POINTS = [
  'A 21-point pre-winter heating checklist you can run yourself',
  'How to spot a failing capacitor before it strands you in a heat wave',
  '4 cheap thermostat habits that drop bills 8–14%',
  'Which NJ rebates apply to your equipment in 2025',
  'The exact filter MERV rating most NJ systems need (and why higher is worse)',
  'A simple test that tells you if your ductwork is leaking conditioned air',
];

export default function GuidePage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Free HVAC Guide', href: '/free-hvac-guide' }]} />

      <section className="py-24 sm:py-32">
        <div className="container-wide grid items-start gap-14 lg:grid-cols-2">
          <div>
            <span className="eyebrow mb-5">Free Download</span>
            <h1 className="heading-display text-balance">
              The NJ Homeowner&apos;s HVAC Savings Guide.
            </h1>
            <p className="mt-5 text-lg text-steel-100">
              12 practical, no-fluff ways NJ homeowners can cut energy bills before the next heating or cooling
              season. Written by NJ-licensed techs, free, no sales pitch.
            </p>

            <ul className="mt-8 space-y-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-steel-100">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-ember-400" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ember-500/30 bg-ember-500/5 p-8 sm:p-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-ember-500/15 ring-1 ring-ember-500/40">
              <FileDown className="h-6 w-6 text-ember-300" />
            </div>
            <h2 className="font-display text-3xl text-white">Get instant access.</h2>
            <p className="mt-2 text-sm text-steel-200">
              Enter your email and we&apos;ll send the PDF straight to your inbox.
            </p>
            <div className="mt-6">
              <LeadMagnetForm />
            </div>
            <p className="mt-4 text-xs text-steel-300">
              We hate spam too. Unsubscribe in one click.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
