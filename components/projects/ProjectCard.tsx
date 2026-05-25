import Image from 'next/image';
import type { Project } from '@/lib/constants';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[4/3]">
        <Image
          src={project.afterImage}
          alt={`${project.title} — ${project.location}`}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-ember-300">
            {project.service}
          </span>
          <span className="text-xs text-steel-300">
            {project.location} · {project.year}
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl text-white">{project.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-steel-200">{project.description}</p>
        {project.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-white/10 px-2 py-0.5 text-xs text-steel-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
