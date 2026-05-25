import { AUTHORS, BUSINESS } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

export type ArticleSchemaProps = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  authorSlug?: string;
  image?: string;
  wordCount?: number;
  category?: string;
};

export function ArticleSchema({
  slug,
  title,
  description,
  datePublished,
  dateModified,
  authorSlug,
  image,
  wordCount,
  category,
}: ArticleSchemaProps) {
  const author = AUTHORS[authorSlug ?? 'pp-mechanical'] ?? AUTHORS['pp-mechanical'];
  const url = `${SITE_URL}/blog/${slug}`;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: title,
    description,
    image: image || `${SITE_URL}/opengraph-image`,
    datePublished,
    dateModified: dateModified || datePublished,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    ...(typeof wordCount === 'number' ? { wordCount } : {}),
    ...(category ? { articleSection: category } : {}),
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: author.name,
      url: SITE_URL,
      description: author.bio,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: BUSINESS.name,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
