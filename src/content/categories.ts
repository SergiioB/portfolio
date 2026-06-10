export const CATEGORY_ORDER = [
  "infrastructure",
  "automation",
  "ai",
  "cloud",
  "local-ai",
  "kotlin",
  "snippets",
  "career",
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_META: Record<CategorySlug, { label: string; description: string }> = {
  infrastructure: {
    label: "Infrastructure",
    description: "RHEL lifecycle, automation, virtualization, and production operations.",
  },
  automation: {
    label: "Automation",
    description: "Ansible playbooks, task automation, and configuration management.",
  },
  ai: {
    label: "AI",
    description:
      "Applied AI across cloud services, local inference, and practical delivery lessons.",
  },
  cloud: {
    label: "Cloud",
    description: "Azure architecture, infrastructure design, and delivery practices.",
  },
  "local-ai": {
    label: "Local AI",
    description: "Running models on local hardware with privacy-first workflows.",
  },
  kotlin: {
    label: "Kotlin",
    description: "Kotlin projects, notes, and engineering experiments.",
  },
  snippets: {
    label: "Snippets",
    description: "Quick commands and reusable building blocks for day-to-day work.",
  },
  career: {
    label: "Career",
    description: "Professional updates, retrospectives, and growth notes.",
  },
};

const CATEGORY_ROUTE_GROUPS: Record<CategorySlug, readonly CategorySlug[]> = {
  infrastructure: ["infrastructure"],
  automation: ["automation"],
  ai: ["ai", "local-ai"],
  cloud: ["cloud"],
  "local-ai": ["local-ai"],
  kotlin: ["kotlin"],
  snippets: ["snippets"],
  career: ["career"],
};

export function getCategoryLabel(slug: string): string {
  if (slug in CATEGORY_META) {
    return CATEGORY_META[slug as CategorySlug].label;
  }
  return slug;
}

export function getCategoryRouteSlugs(slug: string): string[] {
  if (slug in CATEGORY_ROUTE_GROUPS) {
    return [...CATEGORY_ROUTE_GROUPS[slug as CategorySlug]];
  }
  return [slug];
}

export function categoryMatches(postCategories: string[], slug: string): boolean {
  const routeSlugs = getCategoryRouteSlugs(slug);
  return routeSlugs.some((routeSlug) => postCategories.includes(routeSlug));
}
