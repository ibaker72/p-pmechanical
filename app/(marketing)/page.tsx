import { Hero } from '@/components/home/Hero';
import { StatsBar } from '@/components/home/StatsBar';
import { TrustBadges } from '@/components/home/TrustBadges';
import { ServicesGrid } from '@/components/home/ServicesGrid';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { LeadMagnetSection } from '@/components/home/LeadMagnetSection';
import { ServiceAreasMap } from '@/components/home/ServiceAreasMap';
import { Testimonials } from '@/components/home/Testimonials';
import { EmergencyCTA } from '@/components/home/EmergencyCTA';
import { BlogPreview } from '@/components/home/BlogPreview';
import { LocalBusinessSchema } from '@/components/seo/JsonLd';
import { ReviewSchema } from '@/components/seo/ReviewSchema';

export default function HomePage() {
  return (
    <>
      <LocalBusinessSchema />
      <ReviewSchema />
      <Hero />
      <StatsBar />
      <TrustBadges />
      <ServicesGrid />
      <WhyChooseUs />
      <LeadMagnetSection />
      <ServiceAreasMap />
      <Testimonials />
      <EmergencyCTA />
      <BlogPreview />
    </>
  );
}
