"""
Generate SVG diagrams for the Intel Arc Pro B70 SYCL llama.cpp post.
Dark theme matching the portfolio's existing style (generate_more_svgs.py pattern).
Output: public/images/diagrams/new/
"""
import os

OUT = "/home/radxa/projects/portfolio/public/images/diagrams/new"
os.makedirs(OUT, exist_ok=True)

# Color palette (Catppuccin-like, matching existing SVGs)
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
    "teal": "#2dd4bf",
}

# ═══════════════════════════════════════════════════════
# SVG 1: Inference Stack Architecture
# ═══════════════════════════════════════════════════════
svg1 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">
  <defs>
    <style>
      .bg {{ fill: {C["bg"]}; }}
      .title {{ fill: {C["text"]}; font-family: monospace; font-size: 20px; font-weight: bold; }}
      .sub {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 14px; }}
      .code {{ fill: {C["text_code"]}; font-family: monospace; font-size: 13px; }}
      .box {{ fill: {C["surface"]}; stroke: {C["surface_hi"]}; stroke-width: 2; rx: 6; }}
      .box-blue {{ fill: {C["surface"]}; stroke: {C["blue"]}; stroke-width: 2; rx: 6; }}
      .box-green {{ fill: {C["surface"]}; stroke: {C["green"]}; stroke-width: 2; rx: 6; }}
      .box-amber {{ fill: {C["surface"]}; stroke: {C["amber"]}; stroke-width: 2; rx: 6; }}
      .box-purple {{ fill: {C["surface"]}; stroke: {C["purple"]}; stroke-width: 2; rx: 6; }}
      .box-red {{ fill: {C["surface"]}; stroke: {C["red"]}; stroke-width: 2; rx: 6; stroke-dasharray: 6; }}
      .arr {{ stroke: {C["blue"]}; stroke-width: 2; fill: none; marker-end: url(#ah); }}
      .arr-g {{ stroke: {C["green"]}; stroke-width: 2; fill: none; marker-end: url(#ah-g); }}
    </style>
    <marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["blue"]}" />
    </marker>
    <marker id="ah-g" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["green"]}" />
    </marker>
  </defs>

  <rect width="900" height="520" class="bg" />
  <text x="40" y="38" class="title">Intel Arc Pro B70: SYCL Inference Stack</text>
  <text x="40" y="58" class="sub">llama.cpp SYCL + Level Zero + oneAPI on Ubuntu 26.04</text>

  <!-- Layer 1: Client / API -->
  <rect x="40" y="90" width="240" height="80" class="box-blue" />
  <text x="60" y="115" class="title" style="font-size:16px;">OpenAI-Compatible API</text>
  <text x="60" y="138" class="code">llama-server :8080</text>
  <text x="60" y="156" class="code">--jinja --slots --metrics</text>

  <!-- Layer 2: llama.cpp -->
  <rect x="40" y="210" width="240" height="120" class="box-green" />
  <text x="60" y="238" class="title" style="font-size:16px;">llama.cpp (SYCL build)</text>
  <text x="60" y="262" class="code">v9853 · IntelLLVM 2026.0.0</text>
  <text x="60" y="282" class="code">libggml-sycl.so</text>
  <text x="60" y="302" class="code">-dev SYCL0 -ngl 99</text>
  <text x="60" y="318" class="code">--cache-type-k q8_0</text>

  <!-- Layer 3: SYCL / Level Zero -->
  <rect x="40" y="370" width="240" height="80" class="box-purple" />
  <text x="60" y="398" class="title" style="font-size:16px;">SYCL + Level Zero</text>
  <text x="60" y="420" class="code">ONEAPI_DEVICE_SELECTOR=level_zero:0</text>
  <text x="60" y="440" class="code">SYCL_CACHE_PERSISTENT=0</text>

  <!-- Arrows -->
  <path d="M 160 170 L 160 210" class="arr" />
  <path d="M 160 330 L 160 370" class="arr" />

  <!-- Right side: Model + GPU -->
  <!-- Model -->
  <rect x="380" y="90" width="230" height="120" class="box-amber" />
  <text x="400" y="118" class="title" style="font-size:16px;">Qwen3.6-35B-A3B</text>
  <text x="400" y="142" class="code">Q4_K_XL GGUF</text>
  <text x="400" y="162" class="code">20.81 GiB (fits in 32GB)</text>
  <text x="400" y="182" class="code">34.66B total params</text>
  <text x="400" y="200" class="code">MoE active subset</text>

  <!-- GPU -->
  <rect x="380" y="270" width="230" height="140" class="box-green" />
  <text x="400" y="298" class="title" style="font-size:16px;">Intel Arc Pro B70</text>
  <text x="400" y="322" class="code">Battlemage G31 (0xe223)</text>
  <text x="400" y="342" class="code">32GB GDDR6 VRAM</text>
  <text x="400" y="362" class="code">Full 32GB BAR (ReBAR)</text>
  <text x="400" y="382" class="code">xe driver · Ubuntu 26.04</text>
  <text x="400" y="400" class="code">68.45 tok/s (llama-bench)</text>

  <!-- Vulkan (crossed out) -->
  <rect x="380" y="460" width="230" height="44" class="box-red" />
  <text x="400" y="488" class="code" style="fill:{C["red"]};">Vulkan: ~39-42 tok/s (fallback)</text>

  <!-- Connecting arrows -->
  <path d="M 280 150 L 380 150" class="arr-g" />
  <text x="310" y="142" class="code">model load</text>
  <path d="M 280 330 L 380 340" class="arr-g" />
  <text x="310" y="322" class="code">GPU offload</text>

  <!-- Benchmark box -->
  <rect x="690" y="140" width="170" height="140" class="box-blue" />
  <text x="710" y="168" class="title" style="font-size:14px;">Throughput</text>
  <text x="710" y="192" class="code" style="fill:{C["green"]};">pp128: 386.89 t/s</text>
  <text x="710" y="214" class="code" style="fill:{C["green"]};">tg32:  68.45 t/s</text>
  <text x="710" y="240" class="code">API (256 tok):</text>
  <text x="710" y="260" class="code" style="fill:{C["amber"]};">~60.5 tok/s wall</text>

  <path d="M 610 340 L 775 210" class="arr" />
  <text x="690" y="270" class="code">metrics</text>

  <!-- oneAPI box -->
  <rect x="690" y="340" width="170" height="100" class="box-purple" />
  <text x="710" y="368" class="title" style="font-size:14px;">oneAPI Stack</text>
  <text x="710" y="392" class="code">intel-oneapi 2025.3.2</text>
  <text x="710" y="412" class="code">DPC++/C++ Compiler</text>
  <text x="710" y="432" class="code">MKL · OpenCL ICD</text>

  <path d="M 280 410 L 690 390" class="arr" />
  <text x="480" y="385" class="code">SYCL runtime</text>
</svg>'''

with open(f"{OUT}/b70-sycl-inference-stack.svg", "w") as f:
    f.write(svg1)

# ═══════════════════════════════════════════════════════
# SVG 2: SYCL Cache Failure & Fix Flow
# ═══════════════════════════════════════════════════════
svg2 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 600">
  <defs>
    <style>
      .bg {{ fill: {C["bg"]}; }}
      .title {{ fill: {C["text"]}; font-family: monospace; font-size: 20px; font-weight: bold; }}
      .sub {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 13px; }}
      .code {{ fill: {C["text_code"]}; font-family: monospace; font-size: 12px; }}
      .code-r {{ fill: {C["red"]}; font-family: monospace; font-size: 12px; }}
      .code-g {{ fill: {C["green"]}; font-family: monospace; font-size: 12px; }}
      .code-a {{ fill: {C["amber"]}; font-family: monospace; font-size: 12px; }}
      .box {{ fill: {C["surface"]}; stroke: {C["surface_hi"]}; stroke-width: 2; rx: 6; }}
      .box-ok {{ fill: {C["surface"]}; stroke: {C["green"]}; stroke-width: 2; rx: 6; }}
      .box-fail {{ fill: {C["surface"]}; stroke: {C["red"]}; stroke-width: 2; rx: 6; }}
      .box-fix {{ fill: {C["surface"]}; stroke: {C["cyan"]}; stroke-width: 2; rx: 6; }}
      .arr {{ stroke: {C["surface_hi"]}; stroke-width: 2; fill: none; marker-end: url(#ah2); }}
      .arr-r {{ stroke: {C["red"]}; stroke-width: 2; fill: none; marker-end: url(#ah-r); }}
      .arr-g {{ stroke: {C["green"]}; stroke-width: 2; fill: none; marker-end: url(#ah-g2); }}
      .arr-c {{ stroke: {C["cyan"]}; stroke-width: 2; fill: none; marker-end: url(#ah-c); }}
      .check {{ fill: {C["green"]}; font-family: monospace; font-size: 16px; font-weight: bold; }}
      .x-mark {{ fill: {C["red"]}; font-family: monospace; font-size: 16px; font-weight: bold; }}
    </style>
    <marker id="ah2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["surface_hi"]}" />
    </marker>
    <marker id="ah-r" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["red"]}" />
    </marker>
    <marker id="ah-g2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["green"]}" />
    </marker>
    <marker id="ah-c" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["cyan"]}" />
    </marker>
  </defs>

  <rect width="860" height="600" class="bg" />
  <text x="40" y="38" class="title">SYCL Cache Failure: Debug and Fix</text>
  <text x="40" y="58" class="sub">Misleading green checks led to a narrow root cause</text>

  <!-- Column: Checks (all pass) -->
  <text x="100" y="92" class="sub" style="fill:{C["green"]};">ALL CHECKS PASSED</text>

  <!-- Check 1 -->
  <rect x="40" y="105" width="320" height="46" class="box-ok" />
  <text x="55" y="125" class="check">&#10003;</text>
  <text x="80" y="125" class="code">sycl-ls sees B70 via Level Zero</text>
  <text x="80" y="143" class="sub">[level_zero:gpu] Intel Graphics [0xe223]</text>

  <!-- Check 2 -->
  <rect x="40" y="160" width="320" height="46" class="box-ok" />
  <text x="55" y="180" class="check">&#10003;</text>
  <text x="80" y="180" class="code">ReBAR: full 32GB BAR visible</text>
  <text x="80" y="198" class="sub">Region 2: Memory at 1000000000 [size=32G]</text>

  <!-- Check 3 -->
  <rect x="40" y="215" width="320" height="46" class="box-ok" />
  <text x="55" y="235" class="check">&#10003;</text>
  <text x="80" y="235" class="code">Model fits in 32GB VRAM</text>
  <text x="80" y="253" class="sub">Qwen3.6-35B Q4_K_XL = 20.81 GiB</text>

  <!-- Check 4 -->
  <rect x="40" y="270" width="320" height="46" class="box-ok" />
  <text x="55" y="290" class="check">&#10003;</text>
  <text x="80" y="290" class="code">Vulkan loads the model</text>
  <text x="80" y="308" class="sub">~39-42 tok/s (working fallback)</text>

  <!-- Check 5 -->
  <rect x="40" y="325" width="320" height="46" class="box-ok" />
  <text x="55" y="345" class="check">&#10003;</text>
  <text x="80" y="345" class="code">9B sanity model runs on SYCL</text>
  <text x="80" y="363" class="sub">Separates kernel exec from model fit</text>

  <!-- Arrows from checks to failures -->
  <path d="M 360 200 L 460 200" class="arr" />
  <text x="380" y="193" class="sub">but...</text>

  <!-- Column: Failures -->
  <text x="520" y="92" class="sub" style="fill:{C["red"]};">STILL FAILED</text>

  <!-- Failure 1 -->
  <rect x="460" y="105" width="360" height="68" class="box-fail" />
  <text x="475" y="125" class="x-mark">&#10007;</text>
  <text x="500" y="125" class="code-r">llama-server hangs at load_model</text>
  <text x="500" y="145" class="code-a">xe bcs engine reset in dmesg</text>
  <text x="500" y="163" class="sub">GPU offload: -ngl 99 (expected to work)</text>

  <!-- Failure 2 -->
  <rect x="460" y="185" width="360" height="68" class="box-fail" />
  <text x="475" y="205" class="x-mark">&#10007;</text>
  <text x="500" y="205" class="code-r">SIGSEGV during model load</text>
  <text x="500" y="225" class="code-a">Even with -ngl 0 (no GPU layers)</text>
  <text x="500" y="243" class="sub">Points at SYCL backend itself, not VRAM</text>

  <!-- Arrow to root cause -->
  <path d="M 640 253 L 640 290" class="arr-r" />
  <text x="648" y="275" class="code-a">root cause?</text>

  <!-- Root cause box -->
  <rect x="460" y="296" width="360" height="85" class="box-fix" />
  <text x="475" y="316" class="title" style="font-size:15px; fill:{C["cyan"]};">Root Cause</text>
  <text x="475" y="340" class="code" style="fill:{C["cyan"]};">intel/llvm#21972</text>
  <text x="475" y="360" class="code">SYCL persistent cache NULL-deref on</text>
  <text x="475" y="378" class="code">dynamically-loaded SYCL kernel libraries</text>

  <!-- Arrow to fix -->
  <path d="M 640 381 L 640 416" class="arr-c" />

  <!-- Fix -->
  <rect x="460" y="420" width="360" height="105" class="box-fix" />
  <text x="475" y="445" class="title" style="font-size:15px; fill:{C["green"]};">Fix (single line)</text>
  <text x="475" y="470" class="code-g">export SYCL_CACHE_PERSISTENT=0</text>
  <text x="475" y="495" class="sub">+ install libze-dev before build</text>
  <text x="475" y="513" class="sub">+ ONEAPI_DEVICE_SELECTOR=level_zero:0</text>

  <!-- Second fix column -->
  <rect x="40" y="420" width="320" height="105" class="box-fix" />
  <text x="55" y="445" class="title" style="font-size:15px; fill:{C["amber"]};">Also needed</text>
  <text x="55" y="470" class="code-a">sudo apt install -y libze-dev</text>
  <text x="55" y="495" class="sub">Without it: Level Zero headers not found</text>
  <text x="55" y="513" class="sub">GGML_SYCL_SUPPORT_LEVEL_ZERO_API ON but disabled</text>

  <!-- Result -->
  <rect x="220" y="550" width="420" height="38" class="box-ok" />
  <text x="430" y="575" class="code-g" style="font-size:14px;" text-anchor="middle">Qwen3.6-35B-A3B Q4_K_XL runs at 68.45 tok/s on SYCL</text>
  <path d="M 200 525 L 300 555" class="arr-g" />
  <path d="M 640 525 L 560 555" class="arr-g" />
</svg>'''

with open(f"{OUT}/b70-sycl-cache-failure.svg", "w") as f:
    f.write(svg2)

# ═══════════════════════════════════════════════════════
# SVG 3: Build & Runtime Configuration
# ═══════════════════════════════════════════════════════
svg3 = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 620">
  <defs>
    <style>
      .bg {{ fill: {C["bg"]}; }}
      .title {{ fill: {C["text"]}; font-family: monospace; font-size: 20px; font-weight: bold; }}
      .sub {{ fill: {C["text_sub"]}; font-family: monospace; font-size: 13px; }}
      .code {{ fill: {C["text_code"]}; font-family: monospace; font-size: 12px; }}
      .code-g {{ fill: {C["green"]}; font-family: monospace; font-size: 12px; }}
      .code-a {{ fill: {C["amber"]}; font-family: monospace; font-size: 12px; }}
      .code-b {{ fill: {C["blue"]}; font-family: monospace; font-size: 12px; }}
      .code-r {{ fill: {C["red"]}; font-family: monospace; font-size: 12px; }}
      .box {{ fill: {C["surface"]}; stroke: {C["surface_hi"]}; stroke-width: 2; rx: 6; }}
      .box-blue {{ fill: {C["surface"]}; stroke: {C["blue"]}; stroke-width: 2; rx: 6; }}
      .box-green {{ fill: {C["surface"]}; stroke: {C["green"]}; stroke-width: 2; rx: 6; }}
      .box-amber {{ fill: {C["surface"]}; stroke: {C["amber"]}; stroke-width: 2; rx: 6; }}
      .box-red {{ fill: {C["surface"]}; stroke: {C["red"]}; stroke-width: 2; rx: 6; }}
    </style>
  </defs>

  <rect width="860" height="620" class="bg" />
  <text x="40" y="38" class="title">Build &amp; Runtime: Minimal Working Config</text>
  <text x="40" y="58" class="sub">Reproducible steps from source to running server</text>

  <!-- Step 1: Packages -->
  <rect x="40" y="85" width="370" height="190" class="box-blue" />
  <text x="60" y="110" class="title" style="font-size:15px;">1. Install packages</text>
  <text x="60" y="135" class="code">intel-opencl-icd</text>
  <text x="60" y="152" class="code">libze1 · libze-intel-gpu1</text>
  <text x="60" y="169" class="code-g" style="font-weight:bold;">libze-dev  &lt;-- initially missed</text>
  <text x="60" y="186" class="code">intel-ocloc</text>
  <text x="60" y="203" class="code">intel-oneapi-base-toolkit</text>
  <text x="60" y="220" class="code">cmake · git · build-essential</text>
  <text x="60" y="245" class="sub">Without libze-dev: Level Zero headers not found</text>
  <text x="60" y="263" class="sub">CMake detects SYCL but disables L0 API path</text>

  <!-- Step 2: Build -->
  <rect x="450" y="85" width="370" height="190" class="box-green" />
  <text x="470" y="110" class="title" style="font-size:15px;">2. Build llama.cpp</text>
  <text x="470" y="135" class="code-b">cmake -B build-sycl-b70 \\</text>
  <text x="470" y="152" class="code">  -DGGML_SYCL=ON \\</text>
  <text x="470" y="169" class="code">  -DCMAKE_C_COMPILER=icx \\</text>
  <text x="470" y="186" class="code">  -DCMAKE_CXX_COMPILER=icpx \\</text>
  <text x="470" y="203" class="code">  -DCMAKE_BUILD_TYPE=Release \\</text>
  <text x="470" y="220" class="code">  -DGGML_SYCL_F16=ON \\</text>
  <text x="470" y="237" class="code">  -DCMAKE_PREFIX_PATH=.../mkl/latest</text>
  <text x="470" y="263" class="sub">JIT build (no AOT) for stable baseline</text>

  <!-- Step 3: Environment -->
  <rect x="40" y="300" width="370" height="175" class="box-amber" />
  <text x="60" y="325" class="title" style="font-size:15px;">3. Minimal environment</text>
  <text x="60" y="350" class="code-b">source /opt/intel/oneapi/setvars.sh</text>
  <text x="60" y="370" class="code-b">export ONEAPI_DEVICE_SELECTOR=level_zero:0</text>
  <text x="60" y="390" class="code-b">export ZES_ENABLE_SYSMAN=1</text>
  <text x="60" y="410" class="code-g" style="font-weight:bold;">export SYCL_CACHE_PERSISTENT=0</text>
  <text x="60" y="435" class="sub">Intentionally small. Several community</text>
  <text x="60" y="453" class="sub">flags were actively harmful on this stack.</text>
  <text x="60" y="471" class="sub">Final launcher also unsets:</text>

  <!-- Step 4: Server flags -->
  <rect x="450" y="300" width="370" height="175" class="box-green" />
  <text x="470" y="325" class="title" style="font-size:15px;">4. Server flags</text>
  <text x="470" y="350" class="code-b">llama-server \\</text>
  <text x="470" y="367" class="code">  -m /models/Qwen3.6-35B-...gguf \\</text>
  <text x="470" y="384" class="code">  --host 0.0.0.0 --port 8080 \\</text>
  <text x="470" y="401" class="code">  -dev SYCL0 -ngl 99 \\</text>
  <text x="470" y="418" class="code">  -c 16384 --parallel 1 \\</text>
  <text x="470" y="435" class="code">  --no-mmap --flash-attn off \\</text>
  <text x="470" y="452" class="code">  --cache-type-k q8_0 \\</text>
  <text x="470" y="469" class="code">  --reasoning off --metrics --jinja</text>

  <!-- Harmful vars -->
  <rect x="40" y="500" width="370" height="105" class="box-red" />
  <text x="60" y="525" class="title" style="font-size:15px; fill:{C["red"]};">Harmful (avoid)</text>
  <text x="60" y="548" class="code-r">ZEX_NUMBER_OF_CCS=0:4</text>
  <text x="60" y="565" class="code-r">ZEX_NUMBER_OF_CCS=0:8</text>
  <text x="60" y="582" class="code-r">SYCL_UR_USE_LEVEL_ZERO_V2=0</text>
  <text x="60" y="599" class="sub">All caused device enumeration problems</text>

  <!-- Result -->
  <rect x="450" y="500" width="370" height="105" class="box-green" />
  <text x="470" y="525" class="title" style="font-size:15px;">Result</text>
  <text x="470" y="548" class="code-g">systemd: llama-b70.service</text>
  <text x="470" y="565" class="code">OpenAI API at :8080</text>
  <text x="470" y="582" class="code-g">68.45 tok/s bench / ~60 tok/s API</text>
  <text x="470" y="599" class="sub">50-59°C under short load (no thermal wall)</text>

  <!-- Flow arrows -->
  <path d="M 410 180 L 450 180" stroke="{C["blue"]}" stroke-width="2" fill="none" marker-end="url(#ah-flow)" />
  <defs>
    <marker id="ah-flow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="{C["blue"]}" />
    </marker>
  </defs>
  <path d="M 410 390 L 450 390" stroke="{C["blue"]}" stroke-width="2" fill="none" marker-end="url(#ah-flow)" />
</svg>'''

with open(f"{OUT}/b70-sycl-build-runtime.svg", "w") as f:
    f.write(svg3)

print("Generated 3 SVGs:")
print(f"  {OUT}/b70-sycl-inference-stack.svg")
print(f"  {OUT}/b70-sycl-cache-failure.svg")
print(f"  {OUT}/b70-sycl-build-runtime.svg")
