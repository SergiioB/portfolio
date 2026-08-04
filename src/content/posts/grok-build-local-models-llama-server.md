---
title: "Grok Build CLI with local models on llama-server (Arc Pro B70)"
description: "Practical setup for xAI Grok Build against a local OpenAI-compatible llama.cpp server: install, config.toml models, XAI_API_KEY, tools-on usage, profile switching, and real single-stream timings."
pubDate: 2026-07-16
category:
  - local-ai
  - automation
  - b70
tags:
  - grok-build
  - llama.cpp
  - intel-arc
  - b70
  - local-agents
  - openai-compatible
situation: "I already run llama-server (SYCL) on an Intel Arc Pro B70 32GB workstation and want a coding agent CLI against those weights, not only cloud Grok."
issue: "Grok Build defaults to cloud models; local routing needs correct base_url, model IDs, auth env, and an honest split between engine tok/s and agent wall time."
solution: "Install Grok Build, point custom models at http://127.0.0.1:8765/v1 with model id active (or matching served id), set XAI_API_KEY to the server API key, keep tools enabled for real agent work, and switch llama-server profiles underneath."
usedIn: "B70 llama-profile.service :8765, ~/.grok/config.toml, Grok Build 0.2.x, Ornith/Qwen/Gemma local profiles."
impact: "Local agent coding works with tools on; MoE engine decode ~61-69 t/s and long prefill ~1.7k t/s remain the speed floor; agent walls are higher by design."
amazonUrl: https://go.sergiiob.dev/arc-pro
draft: false
---

# Grok Build CLI with local models on llama-server (Arc Pro B70)

This is a setup guide for running **[Grok Build](https://github.com/xai-org/grok-build)** against a **local OpenAI-compatible** endpoint (`llama-server`), measured on an **Intel Arc Pro B70 32GB** workstation.

Hardware reference: [Intel Arc Pro B70 on Amazon](https://go.sergiiob.dev/arc-pro).

Companion results writeup: [Arc Pro B70 clean suite](/posts/arc-pro-b70-gemma31-mtp-moe-clean-suite/).  
Public engine numbers: [LocalMaxxing @ SergiioB](https://www.localmaxxing.com/en/user/SergiioB).

## What you get

```text
Grok Build CLI (tools, edits, shell)
        │  OpenAI-compatible HTTP
        ▼
llama-server :8765  (-a active)
        │  SYCL / Level Zero
        ▼
Intel Arc Pro B70 32GB  (GGUF MoE or dense+MTP)
```

Grok is the **agent**. `llama-server` is the **engine**. Do not mix their metrics.

## Prerequisites

1. Working `llama-server` with OpenAI routes:
   - `GET /v1/models`
   - `POST /v1/chat/completions`
2. An API key accepted by the server (choose your own; never publish it).
3. Enough VRAM for your GGUF (B70 = 32 GB).
4. Optional but recommended: profile switcher / systemd unit so you can hot-swap models.

Verified stack used here:

| Piece      | Value                                            |
| ---------- | ------------------------------------------------ |
| GPU        | Intel Arc Pro B70 32GB                           |
| Engine     | llama.cpp SYCL (`-dev SYCL0`)                    |
| Port       | `8765`                                           |
| Alias      | `-a active`                                      |
| Grok Build | 0.2.x (`~/.grok/bin/grok`)                       |
| Installer  | `curl -fsSL https://x.ai/cli/install.sh \| bash` |

## 1) Install Grok Build

```bash
curl -fsSL https://x.ai/cli/install.sh | bash
export PATH="$HOME/.grok/bin:$PATH"
grok --version
```

Docs: https://docs.x.ai/build/overview · Source: https://github.com/xai-org/grok-build

## 2) Confirm the local engine

```bash
curl -sS -H "Authorization: Bearer YOUR_LOCAL_SERVER_API_KEY" \
  http://127.0.0.1:8765/v1/models | jq .

curl -sS -H "Authorization: Bearer YOUR_LOCAL_SERVER_API_KEY" \
  -H "Content-Type: application/json" \
  http://127.0.0.1:8765/v1/chat/completions \
  -d '{
    "model":"active",
    "messages":[{"role":"user","content":"Say only OK"}],
    "max_tokens":8,
    "temperature":0
  }' | jq '.choices[0].message, .timings'
```

You want a healthy response and `timings.prompt_per_second` / `timings.predicted_per_second` when available.

### Speed flags that matter on B70 (engine)

```bash
llama-server \
  --model /path/to/model.gguf \
  --host 0.0.0.0 --port 8765 \
  --api-key YOUR_LOCAL_SERVER_API_KEY \
  -a active \
  -dev SYCL0 --no-mmap --metrics --slots --jinja \
  --parallel 1 --n-gpu-layers 99 -ncmoe 0 \
  --flash-attn on \
  --cache-type-k q8_0 --cache-type-v q4_1 \
  --ctx-size 131072 \
  -t 8 -b 8192 -ub 4096
```

Dense Gemma 4 31B + Unsloth MTP draft:

```bash
  --spec-type draft-mtp \
  --spec-draft-model /path/to/mtp-gemma-4-31B-it.gguf \
  --spec-draft-n-max 4 \
  --spec-draft-p-min 0.75
```

**Do not** drop to `-ub 256` for “more tokens/s” — it hurt prefill badly in the clean suite.

## 3) Point Grok at localhost

Edit `~/.grok/config.toml`.

Critical details that bit us:

1. **`base_url` must end with `/v1`** and hit the real port (`8765`, not a stale `8080`).
2. **`model` should match what the server exposes.** With `-a active`, the reliable value is **`active`**.
3. **`env_key`** names the env var Grok reads for the Bearer token. Set that env var to the **llama-server API key**, not a cloud xAI secret, when routing fully local.
4. Keep a **default** local model for day-to-day work.

Example (multi-model menu, all local):

```toml
[models]
default = "qwen35-q5"

[model.qwen35-q5]
model = "active"
base_url = "http://127.0.0.1:8765/v1"
name = "Qwen 35B Q5 (local · switch profile underneath)"
env_key = "XAI_API_KEY"

[model.ornith35]
model = "active"
base_url = "http://127.0.0.1:8765/v1"
name = "Ornith 35B Q5 (local)"
env_key = "XAI_API_KEY"

[model.qwen27-mtp]
model = "active"
base_url = "http://127.0.0.1:8765/v1"
name = "Qwen 27B MTP (local)"
env_key = "XAI_API_KEY"

[model.gemma4-31b]
model = "active"
base_url = "http://127.0.0.1:8765/v1"
name = "Gemma 4 31B MTP (local)"
env_key = "XAI_API_KEY"
```

Shell:

```bash
export PATH="$HOME/.grok/bin:$PATH"
export XAI_API_KEY="YOUR_LOCAL_SERVER_API_KEY"   # must match llama-server --api-key
```

Because every entry uses `model = "active"`, **switching intelligence means switching the server profile**, not inventing new remote model names:

```bash
# example workstation helpers
switch-profile qwen35-q5-256k
# or: switch-profile ornith35-q5-256k
# or: switch-profile gemma4-31b-mtp-q4-128k-165w
```

Then in Grok TUI: `/model qwen35-q5` (label only) — the weights are whatever `llama-server` currently loaded.

## 4) Run with tools **on**

Tools are the product. Do not strip them for “fairer model benches” if you care about agent usefulness.

### Interactive

```bash
cd ~/my-project
grok
# /model qwen35-q5
# ask it to edit files, run tests, etc.
```

### One-shot (agentic)

```bash
grok --single "Add a failing test for parse_config, then implement until green." \
  -m qwen35-q5 \
  --always-approve \
  --cwd "$PWD" \
  --no-alt-screen
```

`--always-approve` is YOLO: it will run shell/tools without prompts. Use only on machines and trees you accept risk for.

Useful flags (0.2.x):

| Flag                     | Role                                                    |
| ------------------------ | ------------------------------------------------------- |
| `--single "..."`         | Non-interactive agent turn                              |
| `-m <key>`               | Model key from `config.toml`                            |
| `--cwd PATH`             | Working directory for tools                             |
| `--always-approve`       | Auto-approve tool calls                                 |
| `--no-alt-screen`        | Better for logs / SSH                                   |
| `--disallowed-tools a,b` | Optional allowlist inverse (only if you must constrain) |

## 5) What “fast” actually means (real data)

From the **2026-07-16** clean suite on this B70 (`batch=1`):

### Engine (llama-server timings)

| Profile             | TG (decode t/s) | PP ~4k (prefill t/s) |
| ------------------- | --------------: | -------------------: |
| Ornith 35B Q5 MoE   |        **69.3** |             **1726** |
| Qwen35 Q5 MoE       |            61.5 |                 1690 |
| Qwen35 Q4 MoE       |            62.8 |                 1682 |
| Qwen27 MTP dense    |            25.1 |                  613 |
| Gemma31 MTP @165W   |       24.1–24.8 |              361–363 |
| Gemma31 base no MTP |            16.4 |                  333 |

Shared engine flags for those peaks: `-b 8192 -ub 4096`, FA on, KV `q8_0/q4_1`.

### Agent wall (Grok tools ON, quicksort task)

| Local model | Wall |
| ----------- | ---: |
| Ornith      | 42 s |
| Qwen35-Q5   | 53 s |
| Qwen27 MTP  | 53 s |
| Gemma31 MTP | 83 s |

Same hardware; agent is slower because of tool rounds and re-prefills. That is expected.

## 6) Auth notes (local vs cloud)

| Mode        | `XAI_API_KEY` / `env_key` value | `base_url`                 |
| ----------- | ------------------------------- | -------------------------- |
| Fully local | llama-server API key            | `http://127.0.0.1:8765/v1` |
| Cloud Grok  | real xAI / SuperGrok credential | default xAI API            |

Grok may still ship cloud model entries in config. Local blocks override per model key. Keep secrets out of git.

## 7) Failure modes we hit

| Symptom                            | Fix                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Empty / hung headless runs         | Prefer TUI first; avoid broken flags (`--no-tools` is invalid — use `--disallowed-tools` only if needed) |
| Wrong port in config               | Grep `base_url` for stale `8080`                                                                         |
| 401 from server                    | `XAI_API_KEY` ≠ `--api-key`                                                                              |
| Model not found                    | Serve `-a active` and set `model = "active"`                                                             |
| Slow “prefill” on 20-token prompts | Measure multi-k token prompts; short PP is overhead                                                      |
| Dense Gemma stuck ~16 t/s          | Enable MTP-4 draft; keep large ubatch                                                                    |
| Power at 0 W                       | Set GPU `power1_cap` / profile `powerWatts` before load                                                  |

## 8) Minimal daily workflow

```bash
# 1) load weights
switch-profile qwen35-q5-256k

# 2) agent env
export PATH="$HOME/.grok/bin:$PATH"
export XAI_API_KEY="YOUR_LOCAL_SERVER_API_KEY"

# 3) work
cd ~/code/my-app
grok -m qwen35-q5
```

For pure throughput tests, skip Grok and call `/v1/chat/completions` (or LocalMaxxing methodology). For product feel, use Grok **with tools**.

## Links

- Grok Build repo: https://github.com/xai-org/grok-build
- Grok Build docs: https://docs.x.ai/build/overview
- B70 buy: https://go.sergiiob.dev/arc-pro
- Benchmarks (this host): https://www.localmaxxing.com/en/user/SergiioB
- Results article: https://sergiiob.dev/posts/arc-pro-b70-gemma31-mtp-moe-clean-suite/
