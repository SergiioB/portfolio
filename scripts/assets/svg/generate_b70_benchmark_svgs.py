import os

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "images", "diagrams", "new")
OUT = os.path.normpath(OUT)
os.makedirs(OUT, exist_ok=True)

C = {
    "bg": "#0f172a",
    "surface": "#1e293b",
    "surface_hi": "#334155",
    "text": "#f8fafc",
    "text_sub": "#94a3b8",
    "text_code": "#cbd5e1",
    "blue": "#38bdf8",
    "green": "#4ade80",
    "red": "#ef4444",
    "amber": "#f59e0b",
    "purple": "#a78bfa",
    "cyan": "#22d3ee",
}

# ──────────────────────────────────────────────────
# SVG 1: KV Cache Quantization Comparison
# ──────────────────────────────────────────────────
svg_kv = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560">
  <defs>
    <style>
      .bg {{ fill: {C["bg"]}; }}
      .title {{ fill: {C["text"]}; font-family: monospace; font-size: 20px; font-weight: bold; }}
      .sub {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 13px; }}
      .code {{ fill: {C["text_code"]}; font-family: monospace; font-size: 12px; }}
      .code-g {{ fill: {C["green"]}; font-family: monospace; font-size: 12px; }}
      .code-a {{ fill: {C["amber"]}; font-family: monospace; font-size: 12px; }}
      .code-r {{ fill: {C["red"]}; font-family: monospace; font-size: 12px; }}
      .code-b {{ fill: {C["blue"]}; font-family: monospace; font-size: 12px; }}
      .code-p {{ fill: {C["purple"]}; font-family: monospace; font-size: 12px; }}
      .box {{ fill: {C["surface"]}; stroke: {C["surface_hi"]}; stroke-width: 2; rx: 8; }}
      .box-blue {{ fill: {C["surface"]}; stroke: {C["blue"]}; stroke-width: 2; rx: 8; }}
      .box-green {{ fill: {C["surface"]}; stroke: {C["green"]}; stroke-width: 2; rx: 8; }}
      .box-amber {{ fill: {C["surface"]}; stroke: {C["amber"]}; stroke-width: 2; rx: 8; }}
      .box-purple {{ fill: {C["surface"]}; stroke: {C["purple"]}; stroke-width: 2; rx: 8; }}
      .box-red {{ fill: {C["surface"]}; stroke: {C["red"]}; stroke-width: 2; rx: 8; }}
      .arr {{ stroke: {C["blue"]}; stroke-width: 2; fill: none; marker-end: url(#ah); }}
      .arr-g {{ stroke: {C["green"]}; stroke-width: 2; fill: none; marker-end: url(#ahg); }}
      .label {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 11px; }}
    </style>
    <marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["blue"]}" />
    </marker>
    <marker id="ahg" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["green"]}" />
    </marker>
  </defs>

  <rect width="960" height="560" class="bg" />
  <text x="40" y="38" class="title">KV Cache Quantization: q8_0 vs q5_0-q4_1 on B70 32GB</text>
  <text x="40" y="58" class="sub">llama.cpp b9851 · Intel Arc Pro B70 · hardware-verified</text>

  <!-- ── Left column: baseline q8_0 ── -->
  <rect x="40" y="90" width="300" height="160" class="box-blue" />
  <text x="60" y="116" class="title" style="font-size:15px;">Baseline: q8_0 / q8_0</text>
  <text x="60" y="142" class="code">Effective bits: 8.5 per type</text>
  <text x="60" y="162" class="code">VRAM multiplier: 0.531</text>
  <text x="60" y="186" class="code-a">35B Q5 context ceiling: 128K</text>
  <text x="60" y="206" class="code-a">27B MTP ceiling: 128K</text>
  <text x="60" y="226" class="code">Tail precision: safe</text>

  <!-- ── Right column: optimized q5_0-q4_1 ── -->
  <rect x="620" y="90" width="300" height="160" class="box-green" />
  <text x="640" y="116" class="title" style="font-size:15px;">Optimized: q5_0 K / q4_1 V</text>
  <text x="640" y="142" class="code">Effective bits: 6.0 / 4.5</text>
  <text x="640" y="162" class="code-g">VRAM multiplier: 0.328 (-38%)</text>
  <text x="640" y="186" class="code-g">35B Q5 context ceiling: 256K</text>
  <text x="640" y="206" class="code-g">27B MTP ceiling: 200K</text>
  <text x="640" y="226" class="code-g">Tail precision: 89.84% (safe)</text>

  <!-- Arrow between boxes -->
  <line x1="340" y1="170" x2="620" y2="170" class="arr-g" />
  <text x="430" y="160" class="label">switch K/V types</text>

  <!-- ── Bottom: VRAM bar comparison ── -->
  <text x="40" y="300" class="title" style="font-size:15px;">VRAM Budget per 128K context (35B Q5 model)</text>

  <!-- q8_0 bar -->
  <rect x="40" y="320" width="531" height="36" rx="4" fill="{C["amber"]}" opacity="0.25" stroke="{C["amber"]}" stroke-width="1" />
  <text x="50" y="344" class="code-a">q8_0: 16.2 GB KV (53.1% of VRAM)</text>

  <!-- q5_0-q4_1 bar -->
  <rect x="40" y="370" width="328" height="36" rx="4" fill="{C["green"]}" opacity="0.25" stroke="{C["green"]}" stroke-width="1" />
  <text x="50" y="394" class="code-g">q5_0-q4_1: 10.0 GB KV (32.8% of VRAM)</text>

  <!-- Free VRAM marker -->
  <text x="580" y="344" class="code">free: 14.3 GB</text>
  <text x="380" y="394" class="code-g">free: 20.5 GB (+6.2 GB)</text>

  <!-- ── Bottom: engine speed ── -->
  <rect x="40" y="440" width="880" height="90" class="box-purple" />
  <text x="60" y="466" class="title" style="font-size:15px;">Engine Decode Rate</text>
  <text x="60" y="492" class="code-p">q8_0-q8_0 baseline: measured reference</text>
  <text x="60" y="512" class="code-g">q5_0-q4_1 result: +3.3% faster engine decode</text>
  <text x="60" y="530" class="sub">Measured across 5 hardware-verified tests (control, target, flagship, dense x 2)</text>
</svg>'''

with open(f"{OUT}/b70-kv-cache-comparison.svg", "w") as f:
    f.write(svg_kv)
print("Generated: b70-kv-cache-comparison.svg")

# ──────────────────────────────────────────────────
# SVG 2: MTP Power Scaling Curve (corrected)
# ──────────────────────────────────────────────────
svg_mtp = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560">
  <defs>
    <style>
      .bg {{ fill: {C["bg"]}; }}
      .title {{ fill: {C["text"]}; font-family: monospace; font-size: 20px; font-weight: bold; }}
      .sub {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 13px; }}
      .code {{ fill: {C["text_code"]}; font-family: monospace; font-size: 12px; }}
      .code-g {{ fill: {C["green"]}; font-family: monospace; font-size: 12px; }}
      .code-a {{ fill: {C["amber"]}; font-family: monospace; font-size: 12px; }}
      .code-r {{ fill: {C["red"]}; font-family: monospace; font-size: 12px; }}
      .code-b {{ fill: {C["blue"]}; font-family: monospace; font-size: 12px; }}
      .box {{ fill: {C["surface"]}; stroke: {C["surface_hi"]}; stroke-width: 2; rx: 8; }}
      .box-blue {{ fill: {C["surface"]}; stroke: {C["blue"]}; stroke-width: 2; rx: 8; }}
      .box-green {{ fill: {C["surface"]}; stroke: {C["green"]}; stroke-width: 2; rx: 8; }}
      .box-amber {{ fill: {C["surface"]}; stroke: {C["amber"]}; stroke-width: 2; rx: 8; }}
      .box-red {{ fill: {C["surface"]}; stroke: {C["red"]}; stroke-width: 2; rx: 8; }}
      .label {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 11px; }}
    </style>
  </defs>

  <rect width="960" height="560" class="bg" />
  <text x="40" y="38" class="title">Qwen 27B MTP-4 Power Scaling (Corrected)</text>
  <text x="40" y="58" class="sub">Intel Arc Pro B70 32GB · engine decode rate · warmup discarded</text>

  <!-- ── Power scaling table ── -->
  <rect x="40" y="90" width="500" height="250" class="box-blue" />
  <text x="60" y="116" class="title" style="font-size:15px;">Corrected Power Scaling Data</text>

  <!-- Table headers -->
  <text x="60" y="144" class="sub">Power</text>
  <text x="160" y="144" class="sub">Wall t/s</text>
  <text x="260" y="144" class="sub">Engine t/s</text>
  <text x="370" y="144" class="sub">MTP Gain</text>
  <text x="470" y="144" class="sub">Temp</text>

  <!-- Row: 150W -->
  <text x="60" y="172" class="code">150W</text>
  <text x="160" y="172" class="code">18.4</text>
  <text x="260" y="172" class="code">21.2</text>
  <text x="370" y="172" class="code-g">+28%</text>
  <text x="470" y="172" class="code">48C</text>

  <!-- Row: 165W -->
  <text x="60" y="200" class="code">165W</text>
  <text x="160" y="200" class="code">22.1</text>
  <text x="260" y="200" class="code">25.3</text>
  <text x="370" y="200" class="code-g">+31%</text>
  <text x="470" y="200" class="code">50C</text>

  <!-- Row: 180W (sweet spot) -->
  <rect x="50" y="208" width="480" height="28" rx="4" fill="{C["green"]}" opacity="0.1" />
  <text x="60" y="228" class="code-g">180W</text>
  <text x="160" y="228" class="code-g">25.8</text>
  <text x="260" y="228" class="code-g">29.1</text>
  <text x="370" y="228" class="code-g">+35%</text>
  <text x="470" y="228" class="code-g">52C</text>

  <!-- Row: 230W -->
  <text x="60" y="256" class="code">230W</text>
  <text x="160" y="256" class="code">26.9</text>
  <text x="260" y="256" class="code">30.0</text>
  <text x="370" y="256" class="code-a">+35%</text>
  <text x="470" y="256" class="code-a">61C</text>

  <text x="60" y="284" class="sub">180W = sweet spot: +35% gain, only 52C</text>
  <text x="60" y="304" class="sub">230W = same gain, 9C hotter, diminishing returns</text>
  <text x="60" y="324" class="sub">Diminishing returns above 180W</text>

  <!-- ── Right: methodology fix ── -->
  <rect x="580" y="90" width="340" height="250" class="box-red" />
  <text x="600" y="116" class="title" style="font-size:15px;">Methodology Fix</text>
  <text x="600" y="144" class="code-r">BEFORE (inflated data):</text>
  <text x="600" y="164" class="code-r">Single-prompt caching active</text>
  <text x="600" y="184" class="code-r">Baseline inflated +4-5%</text>
  <text x="600" y="204" class="code-r">Reported gain: +41%</text>
  <text x="600" y="228" class="code-r">AFTER (corrected):</text>
  <text x="600" y="248" class="code-g">Warmup discard enforced</text>
  <text x="600" y="268" class="code-g">Engine rate isolated from wall-clock</text>
  <text x="600" y="288" class="code-g">Cooldown under 52C between rounds</text>
  <text x="600" y="308" class="code-g">Corrected gain: +35%</text>
  <text x="600" y="328" class="sub">b70-verified-bench.sh · 4 diverse prompts</text>

  <!-- ── Bottom: key insight ── -->
  <rect x="40" y="370" width="880" height="80" class="box-amber" />
  <text x="60" y="396" class="title" style="font-size:14px;">Key Insight</text>
  <text x="60" y="418" class="code-a">MTP-4 speculative decoding at 180W delivers the same throughput as 230W</text>
  <text x="60" y="438" class="code-a">with significantly lower thermals. Cap at 180W, measure engine rate,</text>
  <text x="60" y="458" class="code-a">not wall-clock, always discard warmup.</text>

  <!-- ── Bottom: vision results ── -->
  <rect x="40" y="480" width="880" height="60" class="box-green" />
  <text x="60" y="506" class="title" style="font-size:14px;">Vision Benchmark Results (after ffmpeg fix)</text>
  <text x="60" y="528" class="code-g">Qwen 27B MTP-4 @ 180W: 29.1 tok/s engine · overhead: 4-6%</text>
</svg>'''

with open(f"{OUT}/b70-mtp-power-scaling.svg", "w") as f:
    f.write(svg_mtp)
print("Generated: b70-mtp-power-scaling.svg")

# ──────────────────────────────────────────────────
# SVG 3: Context Ceilings Map
# ──────────────────────────────────────────────────
svg_ctx = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <defs>
    <style>
      .bg {{ fill: {C["bg"]}; }}
      .title {{ fill: {C["text"]}; font-family: monospace; font-size: 20px; font-weight: bold; }}
      .sub {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 13px; }}
      .code {{ fill: {C["text_code"]}; font-family: monospace; font-size: 12px; }}
      .code-g {{ fill: {C["green"]}; font-family: monospace; font-size: 12px; }}
      .code-a {{ fill: {C["amber"]}; font-family: monospace; font-size: 12px; }}
      .code-b {{ fill: {C["blue"]}; font-family: monospace; font-size: 12px; }}
      .code-p {{ fill: {C["purple"]}; font-family: monospace; font-size: 12px; }}
      .box {{ fill: {C["surface"]}; stroke: {C["surface_hi"]}; stroke-width: 2; rx: 8; }}
      .box-blue {{ fill: {C["surface"]}; stroke: {C["blue"]}; stroke-width: 2; rx: 8; }}
      .box-green {{ fill: {C["surface"]}; stroke: {C["green"]}; stroke-width: 2; rx: 8; }}
      .box-amber {{ fill: {C["surface"]}; stroke: {C["amber"]}; stroke-width: 2; rx: 8; }}
      .box-purple {{ fill: {C["surface"]}; stroke: {C["purple"]}; stroke-width: 2; rx: 8; }}
      .label {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 11px; }}
    </style>
  </defs>

  <rect width="960" height="540" class="bg" />
  <text x="40" y="38" class="title">Context Ceilings on 32GB VRAM (q5_0-q4_1 KV cache)</text>
  <text x="40" y="58" class="sub">Intel Arc Pro B70 32GB · llama.cpp b9851 · hardware-verified</text>

  <!-- ── Tier 1: 35B Q5 ── -->
  <rect x="40" y="90" width="280" height="140" class="box-amber" />
  <text x="60" y="116" class="title" style="font-size:15px;">Tier 1: Qwen 35B Q5</text>
  <text x="60" y="142" class="code-a">Model weight: 20.8 GB</text>
  <text x="60" y="162" class="code-a">KV per 128K: 10.0 GB</text>
  <text x="60" y="186" class="code-g">Max context: 256K</text>
  <text x="60" y="206" class="code">VRAM at 256K: ~30.8 GB</text>
  <text x="60" y="222" class="code">Headroom: tight but stable</text>

  <!-- ── Tier 2: 27B MTP ── -->
  <rect x="360" y="90" width="280" height="140" class="box-blue" />
  <text x="380" y="116" class="title" style="font-size:15px;">Tier 2: Qwen 27B MTP</text>
  <text x="380" y="142" class="code-b">Model weight: 16.1 GB</text>
  <text x="380" y="162" class="code-b">KV per 128K: 8.2 GB</text>
  <text x="382" y="186" class="code-g">Max context: 200K</text>
  <text x="380" y="206" class="code">VRAM at 200K: ~28.9 GB</text>
  <text x="380" y="222" class="code">MTP draft adds ~1.2 GB</text>

  <!-- ── Tier 3: Ornith 9B ── -->
  <rect x="680" y="90" width="240" height="140" class="box-green" />
  <text x="700" y="116" class="title" style="font-size:15px;">Tier 3: Ornith 9B</text>
  <text x="700" y="142" class="code-g">Model weight: 6.8 GB</text>
  <text x="700" y="162" class="code-g">KV per 128K: 2.1 GB</text>
  <text x="702" y="186" class="code-g">Max context: 1024K+</text>
  <text x="700" y="206" class="code">VRAM at 512K: ~15.2 GB</text>
  <text x="700" y="222" class="code">Plenty of headroom</text>

  <!-- ── Bottom: scaling penalty check ── -->
  <rect x="40" y="260" width="880" height="80" class="box" />
  <text x="60" y="286" class="title" style="font-size:14px;">Context Scaling Penalty</text>
  <text x="60" y="308" class="code-g">Zero penalty observed across all tiers and context lengths (64K to 512K)</text>
  <text x="60" y="326" class="code">Throughput remains flat regardless of filled context length</text>

  <!-- ── Bottom: VRAM budget visualization ── -->
  <text x="40" y="370" class="title" style="font-size:15px;">32GB VRAM Budget at Max Context (q5_0-q4_1)</text>

  <!-- 35B at 256K -->
  <rect x="40" y="390" width="850" height="40" rx="4" fill="{C["amber"]}" opacity="0.15" stroke="{C["amber"]}" stroke-width="1" />
  <text x="50" y="412" class="code-a">35B Q5 @ 256K: 30.8 GB (96%)</text>
  <text x="50" y="424" class="code-a">Context fits tight but stable</text>

  <!-- 27B at 200K -->
  <rect x="40" y="440" width="850" height="40" rx="4" fill="{C["blue"]}" opacity="0.15" stroke="{C["blue"]}" stroke-width="1" />
  <text x="50" y="462" class="code-b">27B MTP @ 200K: 28.9 GB (90%)</text>
  <text x="50" y="474" class="code-b">MTP draft adds ~1.2 GB overhead</text>

  <!-- 9B at 512K -->
  <rect x="40" y="490" width="850" height="40" rx="4" fill="{C["green"]}" opacity="0.15" stroke="{C["green"]}" stroke-width="1" />
  <text x="50" y="512" class="code-g">9B @ 512K: 15.2 GB (47%)</text>
  <text x="50" y="524" class="code-g">Plenty of headroom for growth</text>
</svg>'''

with open(f"{OUT}/b70-context-ceilings.svg", "w") as f:
    f.write(svg_ctx)
print("Generated: b70-context-ceilings.svg")

print(f"\nAll SVGs written to: {OUT}")
print("Files:")
for f_name in sorted(os.listdir(OUT)):
    if "b70-kv-cache-comparison" in f_name or "b70-mtp-power-scaling" in f_name or "b70-context-ceilings" in f_name:
        print(f"  {f_name}")