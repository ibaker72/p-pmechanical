// HowTo schema for service process steps. Maps directly onto the existing
// `process: { title, description }[]` shape used by every service in
// `lib/constants.ts`.
export function HowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { title: string; description: string }[];
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How ${name} works`,
    description,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.description,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
