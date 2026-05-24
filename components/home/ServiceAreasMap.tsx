import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { ALL_SERVICE_AREAS, LOCATIONS } from '@/lib/constants';

const linkedSlugs = new Map(LOCATIONS.map((l) => [l.name, l.slug]));

export function ServiceAreasMap() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl">
          <span className="eyebrow mb-4">Service Area</span>
          <h2 className="heading-section text-balance">
            Proudly serving North Jersey — block by block.
          </h2>
          <p className="mt-4 text-lg text-steel-200">
            From Clifton dispatch we cover every major town in Passaic and Essex counties, plus parts
            of Bergen. Click your town to see local service details.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ALL_SERVICE_AREAS.map((city) => {
            const slug = linkedSlugs.get(city);
            const Card = (
              <div className="group flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ember-400/50 hover:bg-white/[0.06] hover:shadow-emberSoft">
                <MapPin className="h-4 w-4 shrink-0 text-ember-400" />
                <span className="font-display text-lg text-white">{city}, NJ</span>
              </div>
            );
            return slug ? (
              <Link key={city} href={`/locations/${slug}`} aria-label={`HVAC services in ${city}, NJ`}>
                {Card}
              </Link>
            ) : (
              <div key={city}>{Card}</div>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-steel-300">
          Don&apos;t see your town? We probably still serve you — call us to confirm.
        </p>
      </div>
    </section>
  );
}
