export const TARGET_CITIES = [
  'clifton',
  'passaic',
  'paterson',
  'wayne',
  'bloomfield',
  'montclair',
  'nutley',
  'east-orange',
] as const;

export type TargetCitySlug = (typeof TARGET_CITIES)[number];

export function formatCitySlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
