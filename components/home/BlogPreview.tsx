import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { getAllPosts } from '@/lib/blog';

export function BlogPreview() {
  const posts = getAllPosts().slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container-wide">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow mb-4">From the Field</span>
            <h2 className="heading-section text-balance">
              HVAC knowledge for NJ homeowners.
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-sm font-bold uppercase tracking-widest text-ember-300 hover:text-ember-200"
          >
            View all posts →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ember-400/40 hover:shadow-emberSoft"
            >
              <div className="mb-4 flex items-center gap-3 text-xs">
                <span className="rounded-full bg-ember-500/15 px-2.5 py-1 font-semibold uppercase tracking-wider text-ember-300">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-steel-300">
                  <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min read
                </span>
              </div>
              <h3 className="font-display text-2xl text-white group-hover:text-ember-200">
                {post.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-steel-200">
                {post.excerpt}
              </p>
              <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ember-300 group-hover:text-ember-200">
                Read article
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
