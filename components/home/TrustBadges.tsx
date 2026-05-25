import Image from 'next/image';
import { BRANDS, CERTIFICATIONS } from '@/lib/constants';

export function TrustBadges() {
  const items = [...BRANDS, ...CERTIFICATIONS];
  if (items.length === 0) return null;

  return (
    <section className="border-y border-white/10 py-12">
      <div className="container-wide">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-steel-300">
          Authorized installer &amp; certified for
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 md:gap-12">
          {items.map((item) => (
            <Image
              key={item.name}
              src={item.logo}
              alt={item.name}
              width={120}
              height={40}
              className="h-8 w-auto object-contain md:h-10"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
