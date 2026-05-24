import { FileDown, ListChecks, Sparkles } from 'lucide-react';
import { LeadMagnetForm } from '@/components/forms/LeadMagnetForm';

const POINTS = [
  { icon: ListChecks, text: '12 NJ-specific energy savings strategies' },
  { icon: FileDown, text: 'Step-by-step seasonal maintenance checklist' },
  { icon: Sparkles, text: 'Rebates and tax credits you may be missing' },
];

export function LeadMagnetSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Amber wash */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-ember-700/30 via-ink-900 to-ink-950" />
      <div aria-hidden className="absolute inset-0 bg-grid-faint bg-[length:80px_80px] opacity-20" />
      <div aria-hidden className="absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-ember-500/20 blur-3xl" />

      <div className="container-wide relative">
        <div className="mx-auto max-w-4xl text-center">
          <span className="eyebrow justify-center mb-5">Free Download</span>
          <h2 className="heading-section text-balance">
            The NJ Homeowner&apos;s HVAC Savings Guide
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-steel-100">
            12 practical ways to cut your energy bill before winter hits — written by NJ-licensed techs
            for North Jersey homes.
          </p>

          <ul className="mx-auto mt-8 flex max-w-2xl flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-2.5 text-sm font-medium text-white">
                <p.icon className="h-4 w-4 text-ember-400" />
                {p.text}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <LeadMagnetForm />
          </div>
          <p className="mt-4 text-xs text-steel-300">
            No spam. We&apos;ll only email if you ask us to. Unsubscribe in one click.
          </p>
        </div>
      </div>
    </section>
  );
}
