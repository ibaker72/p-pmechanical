import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { Button } from '@/components/ui/button';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { ArticleSchema } from '@/components/seo/ArticleSchema';
import { AUTHORS, BUSINESS } from '@/lib/constants';

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  const author = AUTHORS[post.author ?? 'pp-mechanical'] ?? AUTHORS['pp-mechanical'];
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    authors: [{ name: author.name }],
    keywords: [post.category, 'HVAC NJ', 'Clifton NJ', BUSINESS.name],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [author.name],
      tags: [post.category],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();
  const author = AUTHORS[post.author ?? 'pp-mechanical'] ?? AUTHORS['pp-mechanical'];
  const wordCount = post.content.split(/\s+/).filter(Boolean).length;

  return (
    <>
      <ArticleSchema
        slug={post.slug}
        title={post.title}
        description={post.excerpt}
        datePublished={post.date}
        authorSlug={post.author}
        wordCount={wordCount}
        category={post.category}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Blog', href: '/blog' },
          { name: post.title, href: `/blog/${post.slug}` },
        ]}
      />

      <article className="py-20 sm:py-28">
        <div className="container-tight">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-xs uppercase tracking-widest text-steel-300"
          >
            <Link href="/" className="hover:text-ember-300">
              Home
            </Link>
            <span className="px-2">/</span>
            <Link href="/blog" className="hover:text-ember-300">
              Blog
            </Link>
          </nav>

          <div className="mb-6 flex items-center gap-3 text-xs">
            <span className="rounded-full bg-ember-500/15 px-2.5 py-1 font-semibold uppercase tracking-wider text-ember-300">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-steel-300">
              <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min read
            </span>
            <span className="flex items-center gap-1 text-steel-300">
              <Calendar className="h-3.5 w-3.5" />{' '}
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </span>
          </div>

          <h1 className="heading-display text-balance">{post.title}</h1>
          <p className="mt-5 text-xl text-steel-100">{post.excerpt}</p>

          {/* Author byline — E-E-A-T signal for both Google and AI engines */}
          <div className="mt-8 flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ember-500/15 ring-1 ring-ember-500/40">
              <ShieldCheck className="h-5 w-5 text-ember-300" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-white">{author.name}</p>
              <p className="text-steel-300">
                {author.role} · {author.yearsExperience}+ yrs experience · {author.credentials[0]}
              </p>
            </div>
          </div>

          <hr className="my-10 border-white/10" />

          <div className="prose-pp max-w-none">
            <MDXRemote source={post.content} />
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl border border-ember-500/40 bg-ember-500/10 p-8 sm:p-10">
            <h2 className="font-display text-3xl text-white">Ready to talk to a real HVAC pro?</h2>
            <p className="mt-3 text-steel-100">
              {BUSINESS.name} dispatches across Clifton, Passaic, Paterson, and all of North Jersey.
              Free quotes, flat-rate pricing, 24/7 emergency line.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="primary">
                <Link href="/quote">
                  Get a Free Quote <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
