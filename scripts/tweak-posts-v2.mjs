import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.resolve('src/content/posts');
const OLD_MARKER = '<!-- portfolio:expanded-v1 -->';
const NEW_MARKER = '<!-- portfolio:expanded-v2 -->';

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

const CATEGORY_BASE = {
  infrastructure: {
    baseline: 'service availability, package state, SELinux/firewall posture',
    objective: 'deliver Linux platform changes with controlled blast radius',
    checks: ['`systemctl --failed` stays empty', '`journalctl -p err -b` has no new regressions', 'critical endpoint checks pass from at least two network zones'],
  },
  automation: {
    baseline: 'manual steps, execution time, and failure retry count',
    objective: 'convert manual runbooks into deterministic automation',
    checks: ['`ansible-playbook --check --diff` highlights only intended drift', 'idempotency run returns `changed=0` for stable hosts', 'rollback playbook is executable without ad-hoc edits'],
  },
  ai: {
    baseline: 'input quality, extraction accuracy, and processing latency',
    objective: 'ship AI features with guardrails and measurable quality',
    checks: ['schema validation catches malformed payloads', 'confidence/fallback policy routes low-quality outputs safely', 'observability captures latency + quality per request class'],
  },
  cloud: {
    baseline: 'latency, error budget burn, and cost profile',
    objective: 'improve reliability while keeping cloud spend predictable',
    checks: ['SLO dashboard remains within target after rollout', 'autoscaling and quotas stay inside guardrails', 'security policy checks pass in CI and runtime'],
  },
  'local-ai': {
    baseline: 'RSS usage, token latency, and context utilization',
    objective: 'optimize local inference under strict memory budgets',
    checks: ['runtime memory stays under planned ceiling during peak context', 'decode latency remains stable across repeated runs', 'fallback model/profile activates cleanly when pressure increases'],
  },
  kotlin: {
    baseline: 'frame pacing, startup path, and interaction latency',
    objective: 'improve mobile UX without introducing lifecycle regressions',
    checks: ['critical user flows complete without navigation regressions', 'performance traces show smoother frame delivery', 'shortcut/deeplink paths remain deterministic across app states'],
  },
  snippets: {
    baseline: 'incident frequency and mean time to mitigation',
    objective: 'turn tactical snippets into repeatable operational patterns',
    checks: ['commands are safe against common edge cases', 'runbook version includes pre-check and post-check gates', 'handoff notes specify ownership and escalation path'],
  },
  career: {
    baseline: 'scope clarity, stakeholder alignment, and delivery outcomes',
    objective: 'present engineering decisions with measurable impact',
    checks: ['scope and ownership are explicit', 'execution tradeoffs are documented', 'outcome metrics are tied to business or operational value'],
  },
};

const KEYWORD_PROFILES = [
  {
    match: ['ansible', 'playbook', 'molecule', 'vault'],
    objective: 'increase automation reliability and reduce human variance',
    commands: ['ansible-playbook site.yml --limit target --check --diff', 'ansible-playbook site.yml --limit target', 'ansible all -m ping -o'],
    risks: [
      ['Inventory scope error', 'Wrong hosts receive a valid but unintended change', 'Use explicit host limits and pre-flight host list confirmation'],
      ['Role variable drift', 'Different environments behave inconsistently', 'Pin defaults and validate required vars in CI'],
      ['Undocumented manual step', 'Automation appears successful but remains incomplete', 'Move manual steps into pre/post tasks with assertions'],
    ],
  },
  {
    match: ['lvm', 'partition', 'ext4', 'filesystem'],
    objective: 'change storage allocation safely with reversible checkpoints',
    commands: ['lsblk -f', 'lvdisplay; vgdisplay; pvdisplay', 'resize2fs /dev/mapper/<lv>'],
    risks: [
      ['Incorrect device target', 'Data loss risk increases immediately', 'Require device mapping verification and maintenance window gate'],
      ['Insufficient free extents', 'Resize fails mid-operation', 'Pre-calculate growth/shrink plan before execution'],
      ['Rollback ambiguity', 'Recovery time extends during incident', 'Create snapshot/backup and rollback notes ahead of change'],
    ],
  },
  {
    match: ['llm', 'qwen', 'kv', 'gguf', 'token', 'inference', 'local-ai'],
    objective: 'balance model quality with deterministic runtime constraints',
    commands: ['./llama-server --ctx-size <n> --cache-type-k q4_0 --cache-type-v q4_0', 'curl -s http://localhost:8080/health', 'python benchmark.py --profile edge'],
    risks: [
      ['Over-allocated context', 'Memory pressure causes latency spikes or OOM', 'Tune ctx + cache quantization from measured baseline'],
      ['Silent quality drift', 'Outputs degrade while latency appears fine', 'Track quality samples alongside perf metrics'],
      ['Single-profile dependency', 'No graceful behavior under load', 'Define fallback profile and automatic failover rule'],
    ],
  },
  {
    match: ['android', 'kotlin', 'compose', 'shortcut', 'mobile'],
    objective: 'improve perceived responsiveness and reduce tap-to-task friction',
    commands: ['adb shell dumpsys SurfaceFlinger | findstr refresh', 'adb shell am start -a android.intent.action.VIEW -d "myapp://..."', 'adb shell dumpsys gfxinfo <package>'],
    risks: [
      ['Device-specific behavior', 'UX differs across OEM implementations', 'Test across at least one mid and one high-tier device'],
      ['Navigation edge case', 'Deep links break when app state is partial', 'Normalize entry routing through a single handler'],
      ['Performance regression', 'Small UI changes impact frame pacing', 'Track frame timing in CI/perf checks'],
    ],
  },
  {
    match: ['postgres', 'wal', 'nfs', 'network', 'pam', 'kerberos', 'ad', 'ssl', 'certificate', 'apache'],
    objective: 'harden service integration points and reduce operational surprises',
    commands: ['systemctl status <service>', 'ss -tulpn', 'journalctl -u <service> -n 200 --no-pager'],
    risks: [
      ['Auth or trust mismatch', 'Service looks up but rejects real traffic', 'Validate identity chain and clock/DNS assumptions'],
      ['Policy-control conflict', 'SELinux/firewall blocks valid paths', 'Capture allow-list requirements before rollout'],
      ['Partial restart strategy', 'Config is applied but not activated safely', 'Use staged restart with health gates'],
    ],
  },
  {
    match: ['firebase', 'discord', 'ci', 'pipeline', 'deploy'],
    objective: 'improve release confidence with visible automation outcomes',
    commands: ['npm run build', 'firebase deploy --only hosting', 'curl -I https://<site>/health'],
    risks: [
      ['Pipeline secret drift', 'Deploy path fails unexpectedly', 'Pin secret names and validate before deploy step'],
      ['Notification-only success', 'Chat alert says success while endpoint is broken', 'Gate notifications on real health checks'],
      ['Environment mismatch', 'Prod/staging behavior diverges', 'Use explicit environment matrix in pipeline config'],
    ],
  },
];

const clean = (value) => value.toLowerCase();

const extractField = (frontmatter, key) => {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
};

const parseTags = (frontmatter) => {
  const tagsRaw = extractField(frontmatter, 'tags');
  if (!tagsRaw) return [];
  if (!tagsRaw.startsWith('[')) return [tagsRaw.replace(/"/g, '').replace(/'/g, '').trim()];
  return tagsRaw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((part) => part.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
    .filter(Boolean);
};

const sentenceCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const pickProfile = (slug, title, tags) => {
  const haystack = clean(`${slug} ${title} ${tags.join(' ')}`);
  return KEYWORD_PROFILES.find((profile) => profile.match.some((keyword) => haystack.includes(keyword))) || null;
};

const files = fs
  .readdirSync(POSTS_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => ({ name, fullPath: path.join(POSTS_DIR, name) }));

let rewritten = 0;
let skipped = 0;

for (const file of files) {
  const raw = fs.readFileSync(file.fullPath, 'utf8');
  if (!raw.startsWith('---\n')) {
    skipped += 1;
    continue;
  }

  const fmEnd = raw.indexOf('\n---\n', 4);
  if (fmEnd < 0) {
    skipped += 1;
    continue;
  }

  const frontmatter = raw.slice(4, fmEnd);
  let body = raw.slice(fmEnd + 5);

  const oldMarkerIndex = body.indexOf(OLD_MARKER);
  const newMarkerIndex = body.indexOf(NEW_MARKER);

  if (oldMarkerIndex >= 0) {
    body = body.slice(0, oldMarkerIndex).trimEnd();
  } else if (newMarkerIndex >= 0) {
    body = body.slice(0, newMarkerIndex).trimEnd();
  } else {
    skipped += 1;
    continue;
  }

  const title = extractField(frontmatter, 'title') || file.name.replace(/\.md$/, '');
  const category = (extractField(frontmatter, 'category') || 'infrastructure').toLowerCase();
  const tags = parseTags(frontmatter);
  const slug = file.name.replace(/\.md$/, '');

  const base = CATEGORY_BASE[category] || CATEGORY_BASE.infrastructure;
  const profile = pickProfile(slug, title, tags);
  const diagram = DIAGRAM_BY_CATEGORY[category] || DIAGRAM_BY_CATEGORY.infrastructure;

  const techLens = profile
    ? sentenceCase(profile.objective)
    : `Apply ${category} practices with measurable validation and clear rollback ownership`;

  const commands = profile
    ? profile.commands
    : ['echo "define baseline"', 'echo "apply change with controls"', 'echo "validate result and handoff"'];

  const risks = profile
    ? profile.risks
    : [
        ['Scope ambiguity', 'Teams execute different interpretations', 'Write explicit pre-check and success criteria'],
        ['Weak rollback plan', 'Incident recovery slows down', 'Define rollback trigger + owner before rollout'],
        ['Insufficient telemetry', 'Failures surface too late', 'Require post-change monitoring checkpoints'],
      ];

  const primaryTag = tags[0] || category;
  const secondaryTag = tags[1] || 'operations';
  const tertiaryTag = tags[2] || 'delivery';

  const addition = `\n\n${NEW_MARKER}\n\n## Architecture Diagram\n![${title} execution diagram](${diagram})\n\nThis diagram supports **${title}** and highlights where controls, validation, and ownership boundaries sit in the workflow.\n\n## Post-Specific Engineering Lens\nFor this post, the primary objective is: **${techLens}.**\n\n### Implementation decisions for this case\n- Chose a staged approach centered on **${primaryTag}** to avoid high-blast-radius rollouts.\n- Used **${secondaryTag}** checkpoints to make regressions observable before full rollout.\n- Treated **${tertiaryTag}** documentation as part of delivery, not a post-task artifact.\n\n### Practical command path\nThese are representative execution checkpoints relevant to this post:\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\`\n\n## Validation Matrix\n| Validation goal | What to baseline | What confirms success |\n|---|---|---|\n| Functional stability | ${base.baseline} | ${base.checks[0]} |\n| Operational safety | rollback ownership + change window | ${base.checks[1]} |\n| Production readiness | monitoring visibility and handoff notes | ${base.checks[2]} |\n\n## Failure Modes and Mitigations\n| Failure mode | Why it appears in this type of work | Mitigation used in this post pattern |\n|---|---|---|\n| ${risks[0][0]} | ${risks[0][1]} | ${risks[0][2]} |\n| ${risks[1][0]} | ${risks[1][1]} | ${risks[1][2]} |\n| ${risks[2][0]} | ${risks[2][1]} | ${risks[2][2]} |\n\n## Recruiter-Readable Impact Summary\n- **Scope:** ${base.objective}.\n- **Execution quality:** guarded by staged checks and explicit rollback triggers.\n- **Outcome signal:** repeatable implementation that can be handed over without hidden steps.\n`;

  const next = `${raw.slice(0, fmEnd + 5)}${body}${addition}\n`;
  fs.writeFileSync(file.fullPath, next, 'utf8');
  rewritten += 1;
}

console.log(`Posts rewritten: ${rewritten}`);
console.log(`Posts skipped: ${skipped}`);
