import { BUSINESS, REVIEWS, type Review } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BUSINESS.url;

// Emits individual `Review` objects nested under the business entity. Pairs
// with the `aggregateRating` already on `HvacBusinessSchema` — the individual
// reviews unlock review-snippet eligibility in Google and explicit grounding
// for AI answer engines that quote customer language.
export function ReviewSchema({ reviews = REVIEWS }: { reviews?: Review[] } = {}) {
  const data = reviews.map((r) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: { '@id': `${SITE_URL}#business`, '@type': 'HVACBusiness', name: BUSINESS.name },
    author: { '@type': 'Person', name: r.author },
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    datePublished: r.date,
    reviewBody: r.text,
    locationCreated: { '@type': 'Place', name: r.city },
  }));

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
