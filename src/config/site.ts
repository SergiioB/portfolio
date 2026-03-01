export const SITE = {
  author: 'Sergio B.',
  brand: 'Sergio B. / Field Notes',
  role: 'Linux & Virtualization Engineer',
  tagline: 'Infrastructure delivery, automation, and applied enterprise AI',
  description:
    'Case-study driven portfolio focused on Linux platform engineering, virtualization, Ansible automation, RHEL lifecycle modernization, and practical AI integration in enterprise environments.',
  profileSummary:
    'Linux and virtualization engineer documenting real delivery patterns: clear issue statements, implementation choices, and production outcomes.',
  publicLocation: 'Madrid, Spain (Hybrid)',
  showExactLocation: true,
  copyrightName: 'Sergio B.',
} as const;

export const PUBLIC_LINKS: Array<{ label: string; href: string }> = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sergio-barrientose/' },
];

export const PUBLIC_CV = {
  enabled: true,
  label: 'View CV',
  href: 'docs/cv-sergio-barrientos.html',
  hrefEs: 'docs/cv-sergio-barrientos-es.html',
  external: false,
  openInNewTab: true,
} as const;
