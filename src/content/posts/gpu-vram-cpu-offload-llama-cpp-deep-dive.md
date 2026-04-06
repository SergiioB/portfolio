---
title: "GPU VRAM, CPU Offload, and llama.cpp: The Real Performance Cliff"
description: "An advanced guide to local GPU inference with llama.cpp: why bandwidth matters more than model fit, how hybrid GPU+CPU offload behaves on cards like the RTX 3060 and 5070, what quantization really means mathematically, and how to run it on Linux, Windows, and WSL."
situation: "Teams running local models on consumer GPUs often assume that if a model loads, it is production-ready. In practice, once model layers or KV cache spill from VRAM into system RAM, the system hits a bandwidth cliff and throughput collapses."
usedIn: "Local-first AI engineering runtimes and workstation inference setups using llama.cpp on consumer NVIDIA GPUs."
impact: "Gives engineers a repeatable way to choose practical model sizes, avoid false-positive 'it fits' decisions, and explain why partially offloaded large models often feel much slower than smaller models that stay inside VRAM."
pubDate: 2026-03-25
category: "local-ai"
tags: ["local-ai", "llama.cpp", "cuda", "vram", "offload", "quantization", "wsl", "windows"]
draft: false
---

## Situation

The biggest mistake in local GPU inference is thinking in terms of capacity only:

> "If the model loads, I'm done."

That is the wrong mental model.

The real model is:

> "If the hot path stays in the fastest memory tier, the model is useful. If it spills into a slower tier, performance can collapse."

This post is the advanced version of that idea, focused on:

- VRAM budgeting
- CPU offload
- bandwidth cliffs
- quantized weights
- quantized KV cache
- Linux / Windows / WSL execution patterns

![llama.cpp GPU offload bandwidth cliff](/images/diagrams/gpu-offload-bandwidth-cliff.svg)

This diagram is intentionally simple: move more layers into VRAM until you approach the stable limit, then stop before the spill zone turns RAM traffic into your bottleneck.

## The Bandwidth Wall

### Why partial offload hurts so much

A GPU can execute matrix math extremely fast, but only if the next layers arrive fast enough. When part of the model sits in VRAM and the rest has to be pulled from system RAM, the GPU spends more time waiting on transfers.

That is the real performance cliff.

A simplified memory hierarchy:

| Memory tier |      Approx bandwidth | What it means for inference                                       |
| ----------- | --------------------: | ----------------------------------------------------------------- |
| GPU VRAM    |             very high | ideal home for hot layers and KV activity                         |
| System RAM  |            much lower | acceptable for preload / support data, bad for hot inference path |
| Disk        | unusable for hot path | only for load time                                                |

The exact numbers vary by card and platform, but the operating principle does not:

- fully-in-VRAM models feel dramatically faster
- hybrid GPU+RAM models can still work
- once too much of the model lives in RAM, tokens/s and TTFT can drop hard

## The Core Rule

### Fit is not enough

If a `27B` quantized model only fits by splitting across VRAM and RAM, it may still be worse interactively than a `7B`, `9B`, or `14B` model that fits mostly inside VRAM.

That is why practical local inference is mostly a bandwidth optimization problem.

## Weight Quantization vs KV Cache Quantization

These are related, but they are not the same thing.

### Weight quantization

This reduces the precision of the model parameters themselves.

In rough terms, if full precision stores a weight as a higher-precision value, quantization stores an approximation:

```text
w ≈ s * q
```

Where:

- `w` is the original weight
- `q` is a low-bit integer code
- `s` is a scale factor used to reconstruct an approximate value

In grouped/block quantization, you usually have something closer to:

```text
w_i ≈ s_block * q_i
```

for all weights `i` in a quantization block.

That is the intuition behind formats like:

- `Q4_K_M`
- `Q5_K_M`
- `Q8_0`

The important operational point:

- lower-bit weight quantization reduces VRAM/RAM needs
- but can reduce model fidelity
- and some quant families preserve quality better than others at the same nominal bit width

### KV cache quantization

This does **not** quantize the stored model weights. It quantizes the attention cache created during inference.

Conceptually, for each token the model stores key/value vectors across layers:

```text
K_t, V_t
```

As context grows, those tensors grow too. KV cache quantization stores approximations of those tensors using lower precision:

```text
K_t ≈ s_k * q_k
V_t ≈ s_v * q_v
```

The main value is:

- less memory per token of context
- more headroom for long prompts
- lower risk of OOM under concurrency

The tradeoff is possible quality degradation, especially at longer contexts or more demanding tasks.

## What the common quant names mean

### Weight quant formats

Practical mental model:

- `Q4_*`: usually the best default when you need a strong size/performance tradeoff
- `Q5_*`: larger, often slightly better quality, may be worth it on bigger GPUs
- `Q8_0`: much heavier; useful when you want closer-to-higher-precision behavior and have enough memory

For llama.cpp local workstation use, `Q4_K_M` is often the best default recommendation because it is usually:

- small enough to fit
- high quality relative to its size
- broadly practical on consumer hardware

In practical terms, `Q4`-class weights are often the best middle ground:

- the memory savings versus heavier quants are large
- the quality loss is often small enough to be acceptable for real work
- and avoiding VRAM spill usually matters more than chasing a smaller theoretical quality gain with a heavier quant

That should still be read as a practical rule, not a law of physics. Some models hold up better than others under quantization, and some tasks are more sensitive than others.

### KV cache formats

The main llama.cpp flags are:

```bash
-ctk f16
-ctv f16
```

or:

```bash
-ctk q8_0
-ctv q8_0
```

or:

```bash
-ctk q4_0
-ctv q4_0
```

Practical rule:

- `f16` = safest baseline
- `q8_0` = balanced compromise
- `q4_0` = aggressive memory-saving mode

## Card-by-card thinking

## RTX 3060 12 GB

This is one of the most interesting local-AI cards because it is affordable, but small enough that bad decisions show up quickly.

### What it is good at

- small to medium quantized models that fit mostly in VRAM
- practical interactive use with sensible model sizes
- experimentation with larger models using partial offload

### What to avoid

- assuming 27B is a good default just because it can be coerced to load
- running high context plus heavy offload plus high concurrency at once

### Practical recommendation

On a 3060:

- prefer `Q4_K_M` for bigger models
- keep concurrency low
- treat `27B` hybrid offload as a deliberate quality-over-speed mode

Representative command:

```bash
./llama-server \
  -m /models/Qwen3.5-27B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8080 \
  -c 4096 -t 8 --parallel 1 --jinja \
  -ngl 28 \
  -ctk q8_0 -ctv q8_0 \
  -fa on
```

The exact `-ngl` depends on:

- the model family
- the quant
- the build
- the context size
- KV cache choice
- what else is already using VRAM

### The honest expectation

When a 27B model is only partially on GPU:

- TTFT rises
- prompt processing slows sharply
- decode speed drops
- tokens/s can fall by multiple times compared with a smaller model that stays mostly in VRAM

So if the goal is fast interactive chat, a smaller model that fits well is usually the better engineering decision.

## RTX 5070-class thinking

The exact consumer card variants and VRAM amounts differ, but the same rules apply:

- more VRAM gives you more room to keep hot layers on GPU
- faster memory reduces how much pain you feel before spillover
- CPU offload is still a tax, just a smaller one if less of the model spills

A stronger modern GPU shifts the breakpoints upward:

- larger models become practical
- bigger contexts become practical
- you may be able to keep a `14B` or even larger class model mostly on-device

But the wrong conclusion is still:

> "VRAM got bigger, so bandwidth no longer matters."

Bandwidth still matters. It just fails later.

## Quick comparison: 3060 vs 5070-class vs full-VRAM fit

| Setup                             | What usually happens                                                               | Best use case                                                |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| RTX 3060 12 GB + hybrid offload   | Strong pressure to spill larger models into RAM; 27B is possible but clearly taxed | deliberate quality-over-speed experiments                    |
| 5070-class mid-range modern GPU   | More room for larger models and higher context before the cliff                    | practical workstation inference with better latency headroom |
| Model fully or mostly inside VRAM | Best TTFT and tokens/s; GPU stays fed                                              | interactive chat, coding, agent loops                        |

The pattern is simple:

- the closer you are to full VRAM residency, the better the experience
- the more you spill into RAM, the more you pay in TTFT and throughput

## Q4_K_M vs Q5_K_M vs Q8_0

| Quant    | Typical tradeoff                         | When to choose it                                                   |
| -------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `Q4_K_M` | best default size/quality balance        | first choice for most local users                                   |
| `Q5_K_M` | more memory, often a modest quality gain | when the model still fits comfortably                               |
| `Q8_0`   | much heavier, closer to higher precision | when you have abundant memory and care more about fidelity than fit |

Practical reading:

- if `Q5_K_M` causes spill but `Q4_K_M` fits, `Q4_K_M` is usually the better real-world choice
- `Q8_0` can make sense for smaller models on bigger cards, but is often the wrong choice on constrained consumer setups

## A practical VRAM budgeting formula

Do not budget only the GGUF file size. Play with the calculator below to see how context length and offloading affect the memory footprint.

<div class="interactive-calculator-container" id="vram-calc">
  <div class="calculator-header">
    <h4 style="margin:0;">Interactive VRAM Simulator</h4>
    <span style="font-size:0.8rem; color:var(--text-muted);">Estimates are approximate</span>
  </div>
  
  <div class="calc-row">
    <div class="calc-col">
      <label for="calc-params">Parameters (Billion)</label>
      <input type="range" id="calc-params" min="1" max="70" step="1" value="8" oninput="updateVramCalc()">
      <div class="val-display"><span id="val-params">8</span>B</div>
    </div>
    <div class="calc-col">
      <label for="calc-quant">Quantization</label>
      <select id="calc-quant" onchange="updateVramCalc()">
        <option value="4.5">Q4_K_M (~4.5 bits/weight)</option>
        <option value="5.5">Q5_K_M (~5.5 bits/weight)</option>
        <option value="8.0">Q8_0 (~8.0 bits/weight)</option>
        <option value="16.0">FP16 (16.0 bits/weight)</option>
      </select>
    </div>
  </div>

  <div class="calc-row">
    <div class="calc-col">
      <label for="calc-ctx">Context length (tokens)</label>
      <input type="range" id="calc-ctx" min="512" max="32768" step="512" value="4096" oninput="updateVramCalc()">
      <div class="val-display"><span id="val-ctx">4096</span></div>
    </div>
    <div class="calc-col">
      <label for="calc-kv">KV Cache Quant</label>
      <select id="calc-kv" onchange="updateVramCalc()">
        <option value="16">f16 (standard)</option>
        <option value="8">q8_0 (half size)</option>
        <option value="4">q4_0 (quarter size)</option>
      </select>
    </div>
  </div>

  <div class="calc-row">
    <div class="calc-col">
      <label for="calc-offload">Offload Percentage (%)</label>
      <input type="range" id="calc-offload" min="0" max="100" step="5" value="100" oninput="updateVramCalc()">
      <div class="val-display"><span id="val-offload">100</span>% (mapped via -ngl)</div>
    </div>
  </div>

  <div class="calc-result">
    <div class="result-box">
      <span class="result-label">Weights (VRAM)</span>
      <span class="result-value" id="res-weights">4.5 GB</span>
    </div>
    <div class="result-box">
      <span class="result-label">KV Cache (VRAM)</span>
      <span class="result-value" id="res-kv">0.5 GB</span>
    </div>
    <div class="result-box">
      <span class="result-label">Overhead</span>
      <span class="result-value">0.6 GB</span>
    </div>
    <div class="result-box highlight">
      <span class="result-label">Est. VRAM Needed</span>
      <span class="result-value" id="res-total">5.6 GB</span>
    </div>
  </div>
  
  <div class="calc-assessment" id="calc-assessment">
    Will fit easily on an 8GB GPU.
  </div>
</div>

<script>
function updateVramCalc() {
  const p = parseFloat(document.getElementById('calc-params').value);
  const qBits = parseFloat(document.getElementById('calc-quant').value);
  const ctx = parseInt(document.getElementById('calc-ctx').value);
  const kvBits = parseInt(document.getElementById('calc-kv').value);
  const offloadPct = parseInt(document.getElementById('calc-offload').value) / 100;

  document.getElementById('val-params').innerText = p;
  document.getElementById('val-ctx').innerText = ctx;
  document.getElementById('val-offload').innerText = document.getElementById('calc-offload').value;

  const totalWeightGb = (p * 1e9 * qBits) / 8 / (1024 ** 3);
  const vramWeightGb = totalWeightGb * offloadPct;

  const kvBaseHeuristicGb = (1.2 * (p/8) * (ctx/1000)) / 1024;
  const vramKvGb = kvBaseHeuristicGb * (kvBits / 16);

  const overheadGb = 0.6;
  const totalVramGb = vramWeightGb + vramKvGb + overheadGb;

  document.getElementById('res-weights').innerText = vramWeightGb.toFixed(1) + ' GB';
  document.getElementById('res-kv').innerText = vramKvGb.toFixed(1) + ' GB';
  document.getElementById('res-total').innerText = totalVramGb.toFixed(1) + ' GB';

  let msg = '';
  if (totalVramGb > 24) msg = '<span style="color:#ef4444">Requires a massive 24GB+ GPU (like RTX 3090/4090) or multi-GPU.</span>';
  else if (totalVramGb > 16) msg = '<span style="color:#f59e0b">Requires a 20GB+ GPU or 24GB card (e.g. RTX 4090).</span>';
  else if (totalVramGb > 12) msg = '<span style="color:#f59e0b">Requires a 16GB GPU (e.g. RTX 4080).</span>';
  else if (totalVramGb > 8) msg = '<span style="color:#10b981">Fits on a 12GB GPU (e.g. RTX 3060).</span>';
  else if (totalVramGb > 6) msg = '<span style="color:#10b981">Fits on an 8GB GPU.</span>';
  else msg = '<span style="color:#10b981">Fits comfortably on almost any modern 6GB+ card.</span>';
  
  if (offloadPct < 1.0) {
    msg += ' <br/><span style="font-size:0.85em; opacity:0.8;">Note: Partial offload triggers the system RAM bandwidth cliff.</span>';
  }

  document.getElementById('calc-assessment').innerHTML = msg;
}
if (typeof document !== 'undefined') {
  setTimeout(updateVramCalc, 100);
}
</script>

<style>
.interactive-calculator-container {
  background: var(--bg-surface, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  font-family: var(--font-sans, system-ui, sans-serif);
}
.calculator-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color, #334155);
  padding-bottom: 0.5rem;
}
.calc-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
}
.calc-col {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}
.calc-col label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  margin-bottom: 0.4rem;
}
.calc-col input[type=range], .calc-col select {
  width: 100%;
  margin-bottom: 0.3rem;
  background-color: var(--bg-body, #0f172a);
  color: var(--text-main, #f8fafc);
  border: 1px solid var(--border-color, #334155);
  padding: 0.4rem;
  border-radius: 4px;
}
.val-display {
  font-size: 0.8rem;
  color: var(--text-main, #f8fafc);
  text-align: right;
  font-family: var(--font-mono, monospace);
}
.calc-result {
  display: flex;
  gap: 1rem;
  background: var(--bg-body, #0f172a);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
.result-box {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}
.result-box.highlight {
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
.result-label {
  font-size: 0.7rem;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}
.result-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main, #f8fafc);
  font-family: var(--font-mono, monospace);
  margin-top: 0.3rem;
}
.result-box.highlight .result-value {
  color: #10b981;
}
.calc-assessment {
  margin-top: 1.2rem;
  text-align: center;
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-main, #f8fafc);
}
</style>

The raw formula under the hood of the calculator is roughly:

```text
total_vram_needed ≈ (weights_gb * offload_pct) + kv_cache_gb + runtime_overhead
```

Where:

- `offloaded_weight_bytes` is the portion of the model actually placed on GPU
- `kv_cache_bytes` grows with context length, layer count, and cache precision
- `runtime_overhead` covers allocator slack, CUDA buffers, graph memory, and general serving overhead

Practical rule:

- leave headroom
- do not try to fill VRAM to 100%
- if a model "barely fits," assume it does not fit well enough for a stable interactive setup

## What `-ngl` actually means

In llama.cpp, `-ngl` controls how many transformer layers you attempt to offload to the GPU.

Mental model:

- lower `-ngl` = more layers stay on CPU/RAM
- higher `-ngl` = more layers move to GPU/VRAM
- `-ngl 999` is often used as shorthand for "offload as much as possible"

This is layer-based, not byte-based.

### How to tune `-ngl`

Start simple:

1. pick your model and quant
2. start with a moderate `-ngl`
3. watch VRAM usage and whether the model loads cleanly
4. increase until you approach the memory cliff
5. back off slightly and keep margin for KV cache and runtime overhead

For example:

- if `-ngl 40` fails or causes unstable VRAM pressure
- but `-ngl 28` is stable
- then `28` is the better production number even if `40` looked better on paper

Each extra offloaded layer pushes more of the hot path into VRAM. That usually helps until you run out of headroom.

## Monitor the right thing with `nvidia-smi`

`nvidia-smi` is not enough by itself, but it is still the fastest sanity check while tuning `-ngl`.

Typical workflow:

```bash
watch -n 1 nvidia-smi
```

What to look for:

- VRAM usage climbing as `-ngl` increases
- whether the model load succeeds cleanly
- whether you still have headroom for KV cache and runtime overhead

If VRAM is effectively full and the experience still feels slow, you may already be beyond the practical point where more offload helps.

## How to run a compiled llama.cpp build with GPU + CPU offload

Yes. This is exactly the point of the GPU/offload post.

The hybrid path is:

1. build `llama.cpp` with CUDA enabled
2. run `llama-server` or `llama-cli`
3. offload only as many layers as VRAM can support
4. let the remaining layers live in system RAM

### Linux CUDA build

```bash
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
cmake -B build -DGGML_CUDA=ON
cmake --build build -j
```

Then run a hybrid-offload server:

```bash
./build/bin/llama-server \
  -m /models/Qwen3.5-27B-Q4_K_M.gguf \
  --host 127.0.0.1 --port 8080 \
  -c 4096 -t 8 --parallel 1 --jinja \
  -ngl 28 \
  -ctk q8_0 -ctv q8_0 \
  -fa on
```

### Windows CUDA build

On Windows, the practical route is:

- install recent NVIDIA drivers
- install Visual Studio Build Tools
- install CUDA toolkit
- build `llama.cpp` with CUDA enabled

Representative flow:

```powershell
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release
```

Then run:

```powershell
.\build\bin\Release\llama-server.exe `
  -m D:\models\Qwen3.5-27B-Q4_K_M.gguf `
  --host 127.0.0.1 --port 8080 `
  -c 4096 -t 8 --parallel 1 --jinja `
  -ngl 28 `
  -ctk q8_0 -ctv q8_0 `
  -fa on
```

### WSL setup guidance

Use WSL if you specifically want:

- Linux-style scripts
- Linux build steps
- easier parity with server environments

But WSL only makes sense if GPU passthrough is actually working.

Minimum checks:

```bash
nvidia-smi
./build/bin/llama-server --version
```

If `nvidia-smi` fails inside WSL, you are not running a real GPU inference path there.

## Windows vs Linux vs WSL

| Option         | Best when                                                              | Tradeoffs                                                      |
| -------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| Native Windows | you want the shortest path to a local desktop setup                    | build/tooling can be more Windows-specific                     |
| WSL2           | you want Linux-like scripts and closer parity with server environments | must verify GPU passthrough and avoid bad filesystem placement |
| Linux          | you want the cleanest benchmarking and deployment workflow             | requires a Linux host or dual-boot/server access               |

## Linux

Linux is still the cleanest path for llama.cpp workstation inference:

- easiest CUDA builds
- easier scripting and benchmarking
- lower environment ambiguity

## Native Windows

Native Windows can work fine if you:

- use a good CUDA-enabled llama.cpp build
- keep drivers current
- avoid mixing too many runtime layers

Representative command:

```powershell
.\llama-server.exe `
  -m D:\models\Qwen3.5-14B-Q4_K_M.gguf `
  --host 127.0.0.1 --port 8080 `
  -c 4096 -t 8 --parallel 1 --jinja `
  -ngl 999 `
  -ctk q8_0 -ctv q8_0 `
  -fa on
```

## WSL

WSL is often the best compromise for Windows users who want a Linux-like workflow.

But it should be set up intentionally.

### If you use WSL, do this properly

- use WSL2
- verify CUDA passthrough actually works
- verify the GPU is visible inside WSL before you benchmark
- keep model files on a performant filesystem path
- avoid cross-filesystem overhead for hot workflows when possible

Typical validation steps:

```bash
nvidia-smi
./llama-cli --help
./llama-server --version
```

If WSL GPU passthrough is not working, you are not benchmarking the setup you think you are benchmarking.

## How to choose quantization in practice

### Default recommendation

If someone asks for a single practical answer:

> Start with `Q4_K_M`.

Why:

- it is usually the best first compromise
- it keeps memory pressure down
- it is more likely to fit fully or mostly in VRAM
- it often delivers much better overall UX than a larger higher-quality quant that spills badly

### When to move up

Try larger or heavier quants when:

- the model already fits comfortably
- you care more about quality than latency
- you have enough VRAM headroom for both weights and KV cache

### When to quantize KV cache more aggressively

Use `q8_0` or `q4_0` KV cache when:

- context length is growing
- multiple sessions exist
- you are near the memory cliff

## Practical sizing checklist

Before locking a model in:

1. estimate weight footprint
2. budget KV cache separately
3. leave VRAM headroom for runtime overhead
4. test TTFT, not just steady-state t/s
5. test with realistic context, not toy prompts
6. prefer the smaller model if the larger one spills too much

## Failure modes

| Failure mode              | What it looks like                | What usually caused it                       |
| ------------------------- | --------------------------------- | -------------------------------------------- |
| "It loads but feels slow" | very high TTFT, weak decode speed | too much offload to system RAM               |
| OOM at higher context     | works at 2K, fails at 8K          | KV cache budget ignored                      |
| GPU underutilized         | low throughput despite CUDA       | host-memory bottleneck or poor offload split |
| WSL confusion             | inconsistent results              | GPU passthrough or storage-path issues       |

