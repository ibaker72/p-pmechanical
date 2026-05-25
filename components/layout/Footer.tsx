import Link from 'next/link';
import { Flame, Facebook, Instagram, MapPin, Phone, Mail, ShieldCheck, Star } from 'lucide-react';
import { BUSINESS, RESIDENTIAL_SERVICES, COMMERCIAL_SERVICES, LOCATIONS } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-ink-950">
      {/* Trust bar */}
      <div className="border-b border-white/10 bg-ink-900">
        <div className="container-wide flex flex-col items-center gap-4 py-5 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-steel-100">
            <ShieldCheck className="h-5 w-5 text-ember-400" /> Licensed &amp; Insured in New Jersey
          </div>
          <div className="flex items-center gap-2 text-sm text-steel-200">
            <Star className="h-4 w-4 fill-ember-400 text-ember-400" />
            <Star className="h-4 w-4 fill-ember-400 text-ember-400" />
            <Star className="h-4 w-4 fill-ember-400 text-ember-400" />
            <Star className="h-4 w-4 fill-ember-400 text-ember-400" />
            <Star className="h-4 w-4 fill-ember-400 text-ember-400" />
            <span className="ml-1">4.9 average across 80+ Google reviews</span>
          </div>
        </div>
      </div>

      <div className="container-wide py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Company */}
          <div>
            <Link href="/" className="flex items-center gap-3" aria-label={`${BUSINESS.name} home`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-gradient">
                <Flame className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
              </span>
              <span className="font-display text-xl tracking-wider text-white">
                P&amp;P MECHANICAL
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-steel-200">
              North Jersey&apos;s premier HVAC, boiler, and AC specialists. Same-day service, 24/7
              emergency dispatch, and the cleanest install jobs in Passaic County.
            </p>
            <p className="mt-4 text-xs text-steel-300">{BUSINESS.license}</p>
            <p className="mt-1 text-xs text-steel-300">Founded {BUSINESS.founded}</p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={BUSINESS.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white hover:border-ember-400 hover:text-ember-300"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href={BUSINESS.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white hover:border-ember-400 hover:text-ember-300"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={BUSINESS.social.google}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google Business Profile"
                className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white hover:border-ember-400 hover:text-ember-300"
              >
                <Star className="h-3.5 w-3.5 fill-ember-400 text-ember-400" /> Google Reviews
              </a>
            </div>
          </div>

          {/* Residential Services */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-ember-400">
              Residential
            </h3>
            <ul className="space-y-2.5">
              {RESIDENTIAL_SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-sm text-steel-100 hover:text-ember-300"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Commercial Services */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-ember-400">
              Commercial
            </h3>
            <ul className="space-y-2.5">
              {COMMERCIAL_SERVICES.slice(0, 8).map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/commercial/${s.slug}`}
                    className="text-sm text-steel-100 hover:text-ember-300"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/commercial"
                  className="text-sm font-semibold text-ember-300 hover:text-ember-200"
                >
                  All commercial services →
                </Link>
              </li>
            </ul>
          </div>

          {/* Locations */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-ember-400">
              Service Areas
            </h3>
            <ul className="space-y-2.5">
              {LOCATIONS.map((l) => (
                <li key={l.slug}>
                  <Link
                    href={`/locations/${l.slug}`}
                    className="text-sm text-steel-100 hover:text-ember-300"
                  >
                    {l.name}, NJ
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-ember-400">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-steel-100">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
                <a href={BUSINESS.phoneHref} className="hover:text-ember-300">
                  {BUSINESS.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
                <a href={`mailto:${BUSINESS.email}`} className="hover:text-ember-300">
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ember-400" />
                <address className="not-italic">
                  {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
                  <br />
                  {BUSINESS.serviceArea}
                </address>
              </li>
            </ul>
            <div className="mt-5 rounded-lg border border-ember-500/40 bg-ember-500/10 p-3 text-xs text-ember-100">
              <strong className="block font-bold text-ember-300">24/7 Emergency Line</strong>
              Call anytime — a real person answers.
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-wide flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-steel-300">
            © {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.
          </p>
          <p className="text-xs text-steel-300">
            <Link href="/privacy" className="hover:text-ember-300">
              Privacy
            </Link>
            <span className="px-2 text-steel-500">·</span>
            <Link href="/terms" className="hover:text-ember-300">
              Terms
            </Link>
            <span className="px-2 text-steel-500">·</span>
            Built with precision in NJ
          </p>
        </div>
      </div>
    </footer>
  );
}
