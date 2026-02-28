export const CATEGORY_ORDER = [
  'infrastructure',
  'automation',
  'ai',
  'cloud',
  'local-ai',
  'kotlin',
  'snippets',
  'career',
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_META: Record<CategorySlug, { label: string; description: string }> = {
  infrastructure: {
    label: 'Infrastructure',
    description: 'RHEL lifecycle, automation, virtualization, and production operations.',
  },
  automation: {
    label: 'Automation',
    description: 'Ansible playbooks, task automation, and configuration management.',
  },
  ai: {
    label: 'AI',
    description: 'Generative AI use cases, integration patterns, and practical lessons.',
  },
  cloud: {
    label: 'Cloud',
    description: 'Azure architecture, infrastructure design, and delivery practices.',
  },
  'local-ai': {
    label: 'Local AI',
    description: 'Running models on local hardware with privacy-first workflows.',
  },
  kotlin: {
    label: 'Kotlin',
    description: 'Kotlin projects, notes, and engineering experiments.',
  },
  snippets: {
    label: 'Snippets',
    description: 'Quick commands and reusable building blocks for day-to-day work.',
  },
  career: {
    label: 'Career',
    description: 'Professional updates, retrospectives, and growth notes.',
  },
};

export function getCategoryLabel(slug: string): string {
  if (slug in CATEGORY_META) {
    return CATEGORY_META[slug as CategorySlug].label;
  }
  return slug;
}
