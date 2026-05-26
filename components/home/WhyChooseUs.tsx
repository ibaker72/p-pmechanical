import Image from 'next/image';
import { Zap, Tag, Award, Leaf } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

const POINTS = [
  {
    icon: Zap,
    title: 'Fast Response Times',
    body: 'Most service calls booked same-day. Emergency dispatch under 2 hours, 24/7/365.',
  },
  {
    icon: Tag,
    title: 'Upfront Flat-Rate Pricing',
    body: 'Approve the number before we touch a wrench. No hourly meter, no surprises on the invoice.',
  },
  {
    icon: Award,
    title: 'EPA & NJ Licensed Techs',
    body: 'Factory-trained on every major brand. Every install pulled with permits and inspected.',
  },
  {
    icon: Leaf,
    title: 'Eco-Friendly Systems',
    body: 'High-efficiency equipment, R-454B-ready, and rebate-eligible — built for the next 15 years, not the last 30.',
  },
];

export function WhyChooseUs() {
  return (
    <section className="relative bg-ink-900/50 py-24 sm:py-32">
      <div className="container-wide">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="eyebrow mb-4">Why P&amp;P</span>
            <h2 className="heading-section text-balance">
              The standard the rest of NJ should be held to.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-steel-200">
              We built P&amp;P Mechanical to do HVAC the way our grandparents would have wanted it
              done — honest pricing, real craftsmanship, and a phone that gets answered by a human.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {POINTS.map((p, i) => (
                <Reveal
                  key={p.title}
                  variant="left"
                  delay={i * 0.08}
                  amount={0.3}
                  className="flex gap-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ember-500/10 ring-1 ring-ember-500/30">
                    <p.icon className="h-5 w-5 text-ember-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-white">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-steel-200">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal
            variant="scale"
            amount={0.3}
            className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
          >
            <Image
              src="https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=80"
              alt="P&P Mechanical HVAC technician working on a system"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="glass-card p-4">
                <p className="font-display text-xl text-white">Trusted by 500+ NJ homeowners</p>
                <p className="mt-1 text-xs text-steel-200">
                  From Clifton to Montclair — and every block in between.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
