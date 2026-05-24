import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, ArrowUpRight } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'HVAC Blog & Resources for NJ Homeowners',
  description:
    'Plain-English HVAC, boiler, and AC guides for New Jersey homeowners — from P&P Mechanical, based in Clifton, NJ.',
  alternates: { canonical: '/blog' },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Blog', href: '/blog' }]} />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">From the Field</span>
          <h1 className="heading-display max-w-3xl text-balance">
            HVAC knowledge, no jargon, no upsell.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            Guides, checklists, and straight answers written by NJ-licensed techs for North Jersey homeowners.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-wide">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all hover:-translate-y-1 hover:border-ember-400/40 hover:shadow-emberSoft"
              >
                <div className="mb-4 flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-ember-500/15 px-2.5 py-1 font-semibold uppercase tracking-wider text-ember-300">
                    {p.category}
                  </span>
                  <span className="flex items-center gap-1 text-steel-300">
                    <Clock className="h-3.5 w-3.5" /> {p.readingMinutes} min
                  </span>
                </div>
                <h2 className="font-display text-2xl text-white group-hover:text-ember-200">{p.title}</h2>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-steel-200">{p.excerpt}</p>
                <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300">
                  Read article <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
