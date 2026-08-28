#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const sourceArg = args.find((arg) => !arg.startsWith("--")) ?? "src/data/qwen38-b70-fp8.json";
const outputArg =
  args.find((arg, index) => args[index - 1] === "--out-dir") ?? "public/images/diagrams/new";
const sourcePath = path.resolve(process.cwd(), sourceArg);
const outputPath = path.resolve(process.cwd(), outputArg);
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

fs.mkdirSync(outputPath, { recursive: true });

const COLORS = {
  bg: "#07111f",
  panel: "#0f1d30",
  panelAlt: "#12243a",
  structure: "#263a53",
  text: "#f5f8fc",
  muted: "#9caec4",
  teal: "#55d6be",
  blue: "#68a7ff",
  orange: "#ffb45c",
  gray: "#aeb9c7",
  red: "#ff7b8a",
};

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const fmt = (value, digits = 2) =>
  Number(value)
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
const text = (x, y, value, size = 16, fill = COLORS.text, attrs = "") =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="${size}" font-variant-numeric="tabular-nums" ${attrs}>${esc(value)}</text>`;
const rect = (x, y, width, height, fill = COLORS.panel, radius = 16, attrs = "") =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" ${attrs}/>`;
const line = (x1, y1, x2, y2, stroke = COLORS.structure, width = 1, attrs = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${attrs}/>`;

const shell = (
  id,
  title,
  description,
  width,
  height,
  body
) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${esc(title)}</title>
  <desc id="${id}-desc">${esc(description)}</desc>
  <rect width="${width}" height="${height}" fill="${COLORS.bg}"/>
  ${body}
</svg>
`;

function renderLengthFigure() {
  const width = 1200;
  const height = 660;
  const left = 130;
  const top = 150;
  const chartWidth = 920;
  const chartHeight = 340;
  const max = 70;
  const baseline = top + chartHeight;
  const rows = data.fp8_tp2_c1;
  let body = "";

  body += text(
    60,
    54,
    "Qwen3.8-27B FP8 · TP2 prompt-length screen",
    28,
    COLORS.text,
    'font-weight="700"'
  );
  body += text(
    60,
    88,
    "C1 end-to-end output rate versus approximate post-first decode rate · 230 W cap · n=3",
    16,
    COLORS.muted
  );
  body += rect(60, 112, 1080, 1, COLORS.structure, 0);

  for (let tick = 0; tick <= max; tick += 10) {
    const y = baseline - (tick / max) * chartHeight;
    body += line(
      left,
      y,
      left + chartWidth,
      y,
      tick === 0 ? COLORS.muted : COLORS.structure,
      tick === 0 ? 1.5 : 1
    );
    body += text(left - 18, y + 5, `${tick}`, 13, COLORS.muted, 'text-anchor="end"');
  }
  body += text(
    30,
    top + chartHeight / 2,
    "tok/s",
    14,
    COLORS.muted,
    `text-anchor="middle" transform="rotate(-90 30 ${top + chartHeight / 2})"`
  );

  const groupWidth = chartWidth / rows.length;
  rows.forEach((row, index) => {
    const center = left + groupWidth * index + groupWidth / 2;
    const barWidth = 118;
    const firstX = center - barWidth - 8;
    const secondX = center + 8;
    const firstHeight = (row.output_throughput_tok_s / max) * chartHeight;
    const secondHeight = (row.approx_post_first_tok_s / max) * chartHeight;
    body += rect(firstX, baseline - firstHeight, barWidth, firstHeight, COLORS.blue, 8);
    body += rect(secondX, baseline - secondHeight, barWidth, secondHeight, COLORS.teal, 8);
    body += text(
      firstX + barWidth / 2,
      baseline - firstHeight - 12,
      fmt(row.output_throughput_tok_s),
      15,
      COLORS.blue,
      'font-weight="700" text-anchor="middle"'
    );
    body += text(
      secondX + barWidth / 2,
      baseline - secondHeight - 12,
      fmt(row.approx_post_first_tok_s),
      15,
      COLORS.teal,
      'font-weight="700" text-anchor="middle"'
    );
    body += text(
      center,
      baseline + 30,
      `p${row.input_tokens}`,
      16,
      COLORS.text,
      'font-weight="700" text-anchor="middle"'
    );
    body += text(
      center,
      baseline + 54,
      `TTFT ${fmt(row.mean_ttft_ms / 1000)} s`,
      13,
      COLORS.muted,
      'text-anchor="middle"'
    );
    body += text(
      center,
      baseline + 76,
      `accept ${fmt(row.acceptance_pct)}%`,
      13,
      COLORS.muted,
      'text-anchor="middle"'
    );
  });

  body += rect(720, 108, 18, 18, COLORS.blue, 4);
  body += text(748, 123, "e2e output rate", 14, COLORS.text);
  body += rect(905, 108, 18, 18, COLORS.teal, 4);
  body += text(933, 123, "approx. post-first", 14, COLORS.text);
  body += text(
    60,
    590,
    "The blue rate includes first-token delay. The teal rate is 1000 / mean TPOT and is a decode diagnostic, not the older custom lane statistic.",
    14,
    COLORS.muted
  );
  body += text(60, 620, data.status, 13, COLORS.orange, 'font-weight="700" letter-spacing="1"');

  return shell(
    "qwen38-lengths",
    "Qwen3.8-27B FP8 TP2 prompt-length benchmark",
    "Three fresh n=3 C1 cells at 512, 2048, and 8192 input tokens. Blue bars are end-to-end output throughput. Teal bars are approximate post-first decode throughput.",
    width,
    height,
    body
  );
}

function renderContextFigure() {
  const width = 1200;
  const height = 660;
  const plotLeft = 120;
  const plotTop = 150;
  const plotWidth = 760;
  const plotHeight = 330;
  const plotBottom = plotTop + plotHeight;
  const points = [
    ...data.fp8_tp2_c1.map((row) => ({
      input: row.input_tokens,
      value: row.output_throughput_tok_s,
      label: `p${row.input_tokens}`,
      result: `n=${row.n}`,
    })),
    {
      input: data.full_context.valid_probe.input_tokens,
      value: data.full_context.valid_probe.output_throughput_tok_s,
      label: "p240K",
      result: "n=1",
    },
  ];
  const minX = 512;
  const maxX = data.full_context.valid_probe.input_tokens;
  const minY = 0.1;
  const maxY = 60;
  const xPos = (value) => plotLeft + (Math.log(value / minX) / Math.log(maxX / minX)) * plotWidth;
  const yPos = (value) =>
    plotBottom - (Math.log(value / minY) / Math.log(maxY / minY)) * plotHeight;
  let body = "";

  body += text(60, 54, "C1 rate falls as context fills", 28, COLORS.text, 'font-weight="700"');
  body += text(
    60,
    88,
    "FP8 TP2 / MTP4 / compile-only · log axes · e2e output throughput",
    16,
    COLORS.muted
  );
  body += rect(60, 112, 1080, 1, COLORS.structure, 0);

  [0.1, 1, 10, 60].forEach((tick) => {
    const y = yPos(tick);
    body += line(plotLeft, y, plotLeft + plotWidth, y, COLORS.structure, 1);
    body += text(
      plotLeft - 18,
      y + 5,
      fmt(tick, tick < 1 ? 1 : 0),
      13,
      COLORS.muted,
      'text-anchor="end"'
    );
  });
  [512, 2048, 8192, 240000].forEach((tick) => {
    const x = xPos(tick);
    body += line(x, plotTop, x, plotBottom, COLORS.structure, 1, 'stroke-dasharray="4 6"');
    body += text(
      x,
      plotBottom + 30,
      tick === 240000 ? "240K" : `p${tick}`,
      14,
      COLORS.text,
      'font-weight="700" text-anchor="middle"'
    );
  });
  body += text(
    30,
    plotTop + plotHeight / 2,
    "e2e tok/s",
    14,
    COLORS.muted,
    'text-anchor="middle" transform="rotate(-90 30 315)"'
  );
  body += text(
    plotLeft + plotWidth / 2,
    plotBottom + 62,
    "actual endpoint input tokens · logarithmic scale",
    14,
    COLORS.muted,
    'text-anchor="middle"'
  );

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xPos(point.input)} ${yPos(point.value)}`)
    .join(" ");
  body += `<path d="${path}" fill="none" stroke="${COLORS.teal}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  points.forEach((point, index) => {
    const x = xPos(point.input);
    const y = yPos(point.value);
    body += `<circle cx="${x}" cy="${y}" r="7" fill="${COLORS.teal}" stroke="${COLORS.bg}" stroke-width="3"/>`;
    const labelY = index === points.length - 1 ? y + 28 : y - 17;
    body += text(
      x,
      labelY,
      `${fmt(point.value, point.value < 1 ? 3 : 2)} tok/s`,
      14,
      COLORS.text,
      'font-weight="700" text-anchor="middle"'
    );
  });

  body += rect(925, 150, 215, 330, COLORS.panel, 16, `stroke="${COLORS.structure}"`);
  body += text(950, 188, "Context capacity", 17, COLORS.text, 'font-weight="700"');
  body += text(950, 232, "declared", 12, COLORS.muted, 'letter-spacing="1"');
  body += text(
    950,
    260,
    `${fmt(data.full_context.declared_context_tokens / 1024, 0)}K tokens`,
    26,
    COLORS.teal,
    'font-weight="700"'
  );
  body += text(950, 300, "KV reported", 12, COLORS.muted, 'letter-spacing="1"');
  body += text(
    950,
    328,
    `${data.full_context.reported_kv_tokens.toLocaleString()} tokens`,
    20,
    COLORS.text,
    'font-weight="700"'
  );
  body += text(950, 368, "maximum concurrency", 12, COLORS.muted, 'letter-spacing="1"');
  body += text(
    950,
    396,
    `${fmt(data.full_context.reported_max_concurrency, 2)}×`,
    26,
    COLORS.orange,
    'font-weight="700"'
  );
  body += text(950, 438, "valid probe", 12, COLORS.muted, 'letter-spacing="1"');
  body += text(950, 464, "p240K · n=1", 16, COLORS.text, 'font-weight="700"');

  body += text(
    60,
    560,
    "The exact p262016 attempt was excluded: the client tokenizer produced 282,403 tokens, above the 262,144-token server limit.",
    14,
    COLORS.muted
  );
  body += text(60, 600, data.status, 13, COLORS.orange, 'font-weight="700" letter-spacing="1"');

  return shell(
    "qwen38-context",
    "Qwen3.8-27B FP8 TP2 context scaling",
    "Log-scale C1 end-to-end output throughput from 512 tokens through a valid 240,000-token probe. The server declared a 262,144-token context and reported 603,082 KV tokens.",
    width,
    height,
    body
  );
}

function renderGraphFigure() {
  const width = 1200;
  const height = 700;
  let body = "";
  body += text(
    60,
    54,
    "XPU Graph screen: working paths and metric boundaries",
    28,
    COLORS.text,
    'font-weight="700"'
  );
  body += text(
    60,
    88,
    "Fresh MTP2 graph cells are compared separately from historical MTP4 custom-lane probes",
    16,
    COLORS.muted
  );
  body += rect(60, 112, 1080, 1, COLORS.structure, 0);

  const currentX = 60;
  const currentY = 140;
  const currentW = 500;
  const currentH = 430;
  body += rect(
    currentX,
    currentY,
    currentW,
    currentH,
    COLORS.panel,
    18,
    `stroke="${COLORS.structure}"`
  );
  body += text(
    currentX + 28,
    currentY + 42,
    "Fresh MTP2 full graph",
    19,
    COLORS.text,
    'font-weight="700"'
  );
  body += text(currentX + 28, currentY + 70, "approx. post-first tok/s · n=3", 14, COLORS.muted);
  const graphRows = data.graph_screen.fresh_mtp2_full_graph;
  const gx = currentX + 70;
  const gy = currentY + 120;
  const gw = 350;
  const gh = 220;
  const gbase = gy + gh;
  const gmax = 45;
  for (let tick = 0; tick <= gmax; tick += 15) {
    const y = gbase - (tick / gmax) * gh;
    body += line(
      gx,
      y,
      gx + gw,
      y,
      tick === 0 ? COLORS.muted : COLORS.structure,
      tick === 0 ? 1.5 : 1
    );
    body += text(gx - 12, y + 5, `${tick}`, 12, COLORS.muted, 'text-anchor="end"');
  }
  graphRows.forEach((row, index) => {
    const x = gx + 38 + index * 170;
    const h = (row.approx_post_first_tok_s / gmax) * gh;
    body += rect(x, gbase - h, 100, h, COLORS.blue, 8);
    body += text(
      x + 50,
      gbase - h - 12,
      fmt(row.approx_post_first_tok_s),
      15,
      COLORS.blue,
      'font-weight="700" text-anchor="middle"'
    );
    body += text(
      x + 50,
      gbase + 28,
      `p${row.input_tokens}`,
      14,
      COLORS.text,
      'font-weight="700" text-anchor="middle"'
    );
    body += text(
      x + 50,
      gbase + 50,
      `accept ${fmt(row.acceptance_pct)}%`,
      12,
      COLORS.muted,
      'text-anchor="middle"'
    );
  });
  body += text(
    currentX + 28,
    currentY + currentH - 28,
    "MTP2 full graph is functional; this panel uses a fresh endpoint metric.",
    14,
    COLORS.muted
  );

  const historyX = 590;
  const historyY = 140;
  const historyW = 550;
  const historyH = 430;
  body += rect(
    historyX,
    historyY,
    historyW,
    historyH,
    COLORS.panel,
    18,
    `stroke="${COLORS.structure}"`
  );
  body += text(
    historyX + 28,
    historyY + 42,
    "MTP4 graph modes",
    19,
    COLORS.text,
    'font-weight="700"'
  );
  body += text(
    historyX + 28,
    historyY + 70,
    "historical custom post-first lane · orientation only",
    14,
    COLORS.muted
  );
  const modes = data.graph_screen.historical_mtp4_modes;
  modes.forEach((mode, index) => {
    const y = historyY + 98 + index * 74;
    const hasValue = typeof mode.value_tok_s === "number";
    const stateColor = mode.result.includes("failed")
      ? COLORS.red
      : mode.result.includes("functional")
        ? COLORS.orange
        : COLORS.teal;
    body += rect(
      historyX + 22,
      y,
      historyW - 44,
      58,
      COLORS.panelAlt,
      10,
      `stroke="${COLORS.structure}"`
    );
    body += text(historyX + 40, y + 23, mode.mode, 15, COLORS.text, 'font-weight="700"');
    body += text(historyX + 40, y + 45, mode.graph_setting, 12, COLORS.muted);
    body += hasValue
      ? text(
          historyX + historyW - 42,
          y + 29,
          `${fmt(mode.value_tok_s)} tok/s`,
          17,
          stateColor,
          'font-weight="700" text-anchor="end"'
        )
      : text(
          historyX + historyW - 42,
          y + 29,
          "failed",
          17,
          stateColor,
          'font-weight="700" text-anchor="end"'
        );
  });

  body += rect(60, 590, 1080, 82, COLORS.panelAlt, 12, `stroke="${COLORS.structure}"`);
  body += text(
    84,
    620,
    "MTP4 full graph deadlocked. PIECEWISE made one request work at 44.98 tok/s; compile-only reached",
    14,
    COLORS.text
  );
  body += text(
    84,
    646,
    "46.97 tok/s in a historical n=5 custom lane. Keep graph off for the current MTP4 recipe.",
    14,
    COLORS.text
  );

  return shell(
    "qwen38-graphs",
    "Qwen3.8-27B FP8 XPU Graph screen",
    "Fresh MTP2 full-graph results and historical MTP4 graph-mode probes are shown in separate panels because they use different statistics and evidence strength.",
    width,
    height,
    body
  );
}

function renderMemoryFigure() {
  const width = 1200;
  const height = 700;
  const rows = data.ram_probes;
  const left = 80;
  const top = 170;
  const chartWidth = 670;
  const chartHeight = 300;
  const max = 12;
  const baseline = top + chartHeight;
  let body = "";
  body += text(
    60,
    54,
    "Dual-B70 host-memory failure and the launch fix",
    28,
    COLORS.text,
    'font-weight="700"'
  );
  body += text(
    60,
    88,
    "Probe-level host overhead while allocating device memory",
    16,
    COLORS.muted
  );
  body += rect(60, 112, 1080, 1, COLORS.structure, 0);

  for (let tick = 0; tick <= max; tick += 2) {
    const y = baseline - (tick / max) * chartHeight;
    body += line(
      left,
      y,
      left + chartWidth,
      y,
      tick === 0 ? COLORS.muted : COLORS.structure,
      tick === 0 ? 1.5 : 1
    );
    body += text(left - 14, y + 5, `${tick}`, 12, COLORS.muted, 'text-anchor="end"');
  }
  body += text(
    28,
    top + chartHeight / 2,
    "host overhead GiB",
    14,
    COLORS.muted,
    'text-anchor="middle" transform="rotate(-90 28 320)"'
  );
  const groupWidth = chartWidth / rows.length;
  rows.forEach((row, index) => {
    const center = left + groupWidth * index + groupWidth / 2;
    const barWidth = 112;
    const h = (row.host_overhead_gib / max) * chartHeight;
    const color = index === 0 ? COLORS.red : COLORS.teal;
    body += rect(center - barWidth / 2, baseline - h, barWidth, h, color, 8);
    body += text(
      center,
      baseline - h - 14,
      `${fmt(row.host_overhead_gib)} GiB`,
      16,
      color,
      'font-weight="700" text-anchor="middle"'
    );
    const label = index === 0 ? "both GPUs" : index === 1 ? "one GPU" : "two workers";
    body += text(
      center,
      baseline + 30,
      label,
      14,
      COLORS.text,
      'font-weight="700" text-anchor="middle"'
    );
    body += text(
      center,
      baseline + 52,
      `VRAM ${fmt(row.vram_allocated_gib)} GiB`,
      12,
      COLORS.muted,
      'text-anchor="middle"'
    );
  });

  body += rect(820, 160, 320, 320, COLORS.panel, 16, `stroke="${COLORS.structure}"`);
  body += text(850, 200, "Observed mechanism", 18, COLORS.text, 'font-weight="700"');
  body += text(850, 250, "one process", 14, COLORS.muted);
  body += text(850, 278, "sees both GPUs", 20, COLORS.red, 'font-weight="700"');
  body += text(850, 325, "↓", 24, COLORS.orange, 'font-weight="700"');
  body += text(850, 365, "about 1 GiB host RAM", 18, COLORS.text, 'font-weight="700"');
  body += text(850, 392, "per 1 GiB device allocation", 14, COLORS.muted);
  body += text(850, 438, "fix used here", 14, COLORS.muted);
  body += text(850, 466, "one mask per worker", 18, COLORS.teal, 'font-weight="700"');

  body += rect(60, 535, 1080, 92, COLORS.panelAlt, 14, `stroke="${COLORS.structure}"`);
  body += rect(90, 565, 245, 36, COLORS.panel, 8, `stroke="${COLORS.structure}"`);
  body += text(
    212,
    589,
    "ZE_AFFINITY_MASK=rank",
    14,
    COLORS.text,
    'font-weight="700" text-anchor="middle"'
  );
  body += text(360, 589, "→", 22, COLORS.orange, 'font-weight="700" text-anchor="middle"');
  body += rect(395, 565, 210, 36, COLORS.panel, 8, `stroke="${COLORS.structure}"`);
  body += text(500, 589, "SYS_PTRACE", 14, COLORS.text, 'font-weight="700" text-anchor="middle"');
  body += text(630, 589, "→", 22, COLORS.orange, 'font-weight="700" text-anchor="middle"');
  body += rect(665, 565, 430, 36, COLORS.panel, 8, `stroke="${COLORS.structure}"`);
  body += text(
    880,
    589,
    "FP8 model loads on 32 GiB host",
    14,
    COLORS.teal,
    'font-weight="700" text-anchor="middle"'
  );
  body += text(
    60,
    665,
    "The measurements point to compute-runtime#986 and oneCCL#217. These are local launch workarounds; no upstream fix was verified in this run.",
    13,
    COLORS.muted
  );

  return shell(
    "qwen38-memory",
    "Dual-B70 host memory probe and workaround",
    "A process exposing both GPUs showed about 10.97 GiB host overhead for 11.0 GiB of device allocation. Per-worker masks reduced the isolated probe overhead to 0.82 GiB across two workers.",
    width,
    height,
    body
  );
}

const figures = [
  ["qwen38-fp8-tp2-lengths.svg", renderLengthFigure()],
  ["qwen38-fp8-context.svg", renderContextFigure()],
  ["qwen38-fp8-graphs.svg", renderGraphFigure()],
  ["qwen38-b70-memory-fix.svg", renderMemoryFigure()],
];

for (const [filename, contents] of figures) {
  fs.writeFileSync(path.join(outputPath, filename), contents, "utf8");
}

console.log(`Generated ${figures.length} figures from ${path.relative(process.cwd(), sourcePath)}`);
