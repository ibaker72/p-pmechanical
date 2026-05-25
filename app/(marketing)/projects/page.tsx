import type { Metadata } from 'next';
import Link from 'next/link';
import { PROJECTS, BUSINESS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { BreadcrumbSchema, LocalBusinessSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Recent Projects',
  description:
    'Before-and-after HVAC, boiler, and AC installations completed by P&P Mechanical across Clifton and the surrounding North Jersey region.',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  return (
    <>
      <LocalBusinessSchema />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Projects', href: '/projects' },
        ]}
      />

      <section className="border-b border-white/10 py-20 sm:py-28">
        <div className="container-wide">
          <span className="eyebrow mb-5">Our Work</span>
          <h1 className="heading-display max-w-3xl text-balance">
            Recent projects across North Jersey.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-steel-200">
            Real installs and repairs from Clifton, Passaic, Paterson, and the surrounding towns —
            boilers, central air, ductless mini-splits, and more.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-wide">
          {PROJECTS.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PROJECTS.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <h2 className="font-display text-2xl text-white">Project gallery coming soon.</h2>
              <p className="mt-3 text-steel-200">
                We&apos;re putting together before-and-after photos of recent installs. In the
                meantime, request a free quote or call us to talk through your project.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" variant="primary">
                  <Link href="/quote">Get a Free Quote</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
