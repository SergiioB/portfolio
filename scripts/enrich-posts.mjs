import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.resolve('src/content/posts');
const MARKER = '<!-- portfolio:expanded-v1 -->';

const DIAGRAM_BY_CATEGORY = {
  infrastructure: '/images/diagrams/post-framework/infrastructure-flow.svg',
  automation: '/images/diagrams/post-framework/automation-loop.svg',
  ai: '/images/diagrams/post-framework/ai-pipeline.svg',
  cloud: '/images/diagrams/post-framework/cloud-ops.svg',
  'local-ai': '/images/diagrams/post-framework/local-ai-memory.svg',
  kotlin: '/images/diagrams/post-framework/kotlin-mobile.svg',
  snippets: '/images/diagrams/post-framework/snippets-runbook.svg',
  career: '/images/diagrams/post-framework/career-growth.svg',
};

const CATEGORY_NOTES = {
  infrastructure: {
    focus: 'platform reliability, lifecycle controls, and repeatable Linux delivery',
    sequence: ['Baseline current state', 'Apply change in controlled stage', 'Run post-change validation', 'Document handoff and rollback point'],
  },
  automation: {
    focus: 'repeatability, failure isolation, and lower manual intervention',
    sequence: ['Define deterministic inputs', 'Execute automation with guardrails', 'Collect outputs and drift signals', 'Iterate runbook from telemetry'],
  },
  ai: {
    focus: 'quality thresholds, data normalization, and safe model integration',
    sequence: ['Capture representative data', 'Normalize and validate schema', 'Run model task with constraints', 'Review output quality and fallback behavior'],
  },
  cloud: {
    focus: 'cost-aware operations, resiliency, and secure service boundaries',
    sequence: ['Define service boundary and SLO', 'Deploy with policy checks', 'Observe latency/errors/cost', 'Tune capacity and controls'],
  },
  'local-ai': {
    focus: 'memory budgeting, latency behavior, and stable edge inference',
    sequence: ['Measure baseline runtime footprint', 'Tune quantization/context/runtime flags', 'Benchmark latency and memory impact', 'Select production-safe profile'],
  },
  kotlin: {
    focus: 'runtime performance, lifecycle correctness, and maintainable app architecture',
    sequence: ['Isolate UX or performance issue', 'Refactor with clear layer boundaries', 'Validate on target devices', 'Track regressions through repeatable tests'],
  },
  snippets: {
    focus: 'fast remediation patterns turned into reusable operational playbooks',
    sequence: ['Use targeted snippet for incident recovery', 'Validate outcome and side effects', 'Standardize command pattern', 'Promote into documented runbook'],
  },
  career: {
    focus: 'decision quality, delivery ownership, and measurable business impact',
    sequence: ['Define scope and objective', 'Execute with stakeholder alignment', 'Measure operational result', 'Capture lessons and next-level ownership'],
  },
};

const toTitle = (value) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const extractField = (frontmatter, key) => {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
};

const parseTags = (frontmatter) => {
  const tagsRaw = extractField(frontmatter, 'tags');
  if (!tagsRaw) return [];
  if (!tagsRaw.startsWith('[')) return [tagsRaw.toLowerCase()];
  return tagsRaw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((part) => part.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());
};

const listPosts = fs
  .readdirSync(POSTS_DIR)
  .filter((file) => file.endsWith('.md'))
  .map((file) => path.join(POSTS_DIR, file));

let updated = 0;
let skipped = 0;

for (const postPath of listPosts) {
  const raw = fs.readFileSync(postPath, 'utf8');
  if (!raw.startsWith('---\n')) {
    skipped += 1;
    continue;
  }

  const secondFence = raw.indexOf('\n---\n', 4);
  if (secondFence < 0) {
    skipped += 1;
    continue;
  }

  const frontmatter = raw.slice(4, secondFence);
  const body = raw.slice(secondFence + 5);

  if (body.includes(MARKER)) {
    skipped += 1;
    continue;
  }

  const title = extractField(frontmatter, 'title') || toTitle(path.basename(postPath, '.md'));
  const category = (extractField(frontmatter, 'category') || 'infrastructure').toLowerCase();
  const tags = parseTags(frontmatter);

  const diagram = DIAGRAM_BY_CATEGORY[category] || DIAGRAM_BY_CATEGORY.infrastructure;
  const profile = CATEGORY_NOTES[category] || CATEGORY_NOTES.infrastructure;

  const primaryTag = tags[0] || category;
  const secondaryTag = tags[1] || 'operations';

  const appendix = `\n\n${MARKER}\n\n## Architecture Diagram\n![${title} supporting diagram](${diagram})\n\nThis visual summarizes the implementation flow and control points for **${title}**.\n\n## Deep Dive\nThis case is strongest when explained as an execution narrative instead of only a command sequence. The core focus here is **${profile.focus}**, with decisions made to keep implementation repeatable under production constraints.\n\n### Design choices\n- Preferred deterministic configuration over one-off remediation to reduce variance between environments.\n- Treated **${primaryTag}** and **${secondaryTag}** as the main risk vectors during implementation.\n- Kept rollback behavior explicit so operational ownership can be transferred safely across teams.\n\n### Operational sequence\n1. ${profile.sequence[0]}.\n2. ${profile.sequence[1]}.\n3. ${profile.sequence[2]}.\n4. ${profile.sequence[3]}.\n\n## Validation and Evidence\nUse this checklist to prove the change is production-ready:\n- Baseline metrics captured before execution (latency, error rate, resource footprint, or service health).\n- Post-change checks executed from at least two viewpoints (service-level and system-level).\n- Failure scenario tested with a known rollback path.\n- Runbook updated with final command set and ownership boundaries.\n\n## Risks and Mitigations\n| Risk | Why it matters | Mitigation |\n|---|---|---|\n| Configuration drift | Reduces reproducibility across environments | Enforce declarative config and drift checks |\n| Hidden dependency | Causes fragile deployments | Validate dependencies during pre-check stage |\n| Observability gap | Delays incident triage | Require telemetry and post-change verification points |\n\n## Reusable Takeaways\n- Convert one successful fix into a reusable delivery pattern with clear pre-check and post-check gates.\n- Attach measurable outcomes to each implementation step so stakeholders can validate impact quickly.\n- Keep documentation concise, operational, and versioned with the same lifecycle as code.\n`;

  const nextBody = `${body.trimEnd()}${appendix}\n`;
  fs.writeFileSync(postPath, `${raw.slice(0, secondFence + 5)}${nextBody}`);
  updated += 1;
}

console.log(`Posts updated: ${updated}`);
console.log(`Posts skipped: ${skipped}`);
