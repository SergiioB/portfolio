export const SITE = {
  author: 'Sergio B.',
  brand: 'SB / Field Notes',
  role: 'Infrastructure Engineer',
  tagline: 'Infrastructure, automation, cloud, and practical AI notes',
  description:
    'A static knowledge portfolio focused on production operations, infrastructure automation, cloud delivery, and privacy-aware local AI experiments.',
  profileSummary:
    'Production-minded infrastructure engineering with a focus on reliable automation, platform operations, and practical AI enablement.',
  publicLocation: 'Europe (UTC+1)',
  showExactLocation: false,
  contactNote: 'Direct contact details are intentionally not published in the repository or site source.',
  copyrightName: 'Sergio B.',
} as const;

export const PUBLIC_LINKS: Array<{ label: string; href: string }> = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sergio-barrientose/' },
];

export const PUBLIC_CV = {
  enabled: true,
  label: 'View CV',
  href: 'docs/cv-public.pdf',
  external: false,
  openInNewTab: true,
} as const;
