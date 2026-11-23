export const SITE = {
  author: "Sergio B.",
  brand: "Sergio B. / Field Notes",
  role: "AI Systems & Linux Infrastructure Engineer",
  tagline: "Intel Arc Pro B70 inference research, enterprise Linux, and shipped local-first apps",
  description:
    "Case-study driven portfolio focused on Intel Arc Pro B70 local AI inference (XeCores), enterprise Linux platform engineering, Ansible automation, and shipped local-first products.",
  keywords: [
    "Intel Arc Pro B70",
    "XeCores",
    "local AI inference",
    "vLLM XPU",
    "llama.cpp SYCL",
    "OpenVINO",
    "Linux engineer",
    "Ansible automation",
    "RHEL",
    "platform engineering",
    "systems architecture",
  ],
  profileSummary:
    "Linux platform engineer and founder of XeCores, documenting reproducible local AI inference on Intel Arc Pro B70 alongside enterprise Linux operations and shipped Android apps.",
  publicLocation: "Madrid, Spain (Hybrid)",
  showExactLocation: true,
  copyrightName: "Sergio B.",
} as const;

export const PUBLIC_LINKS: Array<{
  label: string;
  href: string;
  badge: string;
  i18nKey: string;
}> = [
  {
    label: "XeCores Lab",
    href: "https://xecores.com/",
    badge: "Xe",
    i18nKey: "exec.xecores",
  },
  {
    label: "Hugging Face",
    href: "https://huggingface.co/SergiioB",
    badge: "HF",
    i18nKey: "exec.huggingface",
  },
  {
    label: "GitHub",
    href: "https://github.com/SergiioB",
    badge: "{}",
    i18nKey: "exec.github",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/sergio-barrientose/",
    badge: "in",
    i18nKey: "exec.linkedin",
  },
  {
    label: "X (@SergiiioBS)",
    href: "https://x.com/SergiiioBS",
    badge: "𝕏",
    i18nKey: "exec.x",
  },
];

export const PUBLIC_CV = {
  enabled: true,
  label: "View CV",
  href: "docs/cv-sergio-barrientos.pdf",
  hrefEs: "docs/cv-sergio-barrientos-es.pdf",
  external: false,
  openInNewTab: true,
} as const;

export const PUBLIC_COVER_LETTER = {
  enabled: false,
  label: "View Cover Letter",
  href: "docs/cover-letter-sergio-barrientos.html",
  hrefEs: "docs/cover-letter-sergio-barrientos-es.html",
  external: false,
  openInNewTab: true,
} as const;
