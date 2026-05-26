import type { MetadataRoute } from 'next';
import { RESIDENTIAL_SERVICES, COMMERCIAL_SERVICES, LOCATIONS } from '@/lib/constants';
import { getAllPosts } from '@/lib/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ppmechanicalllc.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = [
    '',
    '/services',
    '/commercial',
    '/locations',
    '/about',
    '/projects',
    '/contact',
    '/quote',
    '/free-hvac-guide',
    '/blog',
    '/faq',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }));

  const servicePages = RESIDENTIAL_SERVICES.map((s) => ({
    url: `${SITE_URL}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const commercialServicePages = COMMERCIAL_SERVICES.map((s) => ({
    url: `${SITE_URL}/commercial/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const locationPages = LOCATIONS.map((l) => ({
    url: `${SITE_URL}/locations/${l.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const blogPages = getAllPosts().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...servicePages,
    ...commercialServicePages,
    ...locationPages,
    ...blogPages,
  ];
}
