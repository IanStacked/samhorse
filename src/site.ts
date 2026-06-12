// Central site metadata. Swap these for the real details.
export const SITE = {
  name: 'Samantha Rodgers',
  role: 'Equestrian',
  description:
    'Show jumping and eventing portfolio — horses, competition results, and photography.',
} as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/horses', label: 'Horses' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/gallery', label: 'Gallery' },
] as const;

/** Age in years from a foaling (birth) year, as of the build date. */
export function horseAge(foaled: number): number {
  return new Date().getFullYear() - foaled;
}
