#!/usr/bin/env python3
"""SVGs for B70 Gemma31/MoE Jul 2026 clean bench portfolio post."""
from pathlib import Path
import xml.etree.ElementTree as ET

OUT = Path("/home/radxa/projects/portfolio/public/images/diagrams/new")
OUT.mkdir(parents=True, exist_ok=True)

BG = "#0f172a"
PANEL = "#1e293b"
BORDER = "#334155"
TEXT = "#e2e8f0"
MUTED = "#94a3b8"
CYAN = "#22d3ee"
GREEN = "#34d399"
AMBER = "#fbbf24"
PURPLE = "#a78bfa"
BLUE = "#60a5fa"
RED = "#f87171"


def svg_root(w, h):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img">
  <defs>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="{BORDER}" stroke-width="0.5" opacity="0.35"/>
    </pattern>
  </defs>
  <rect width="{w}" height="{h}" fill="{BG}"/>
  <rect width="{w}" height="{h}" fill="url(#grid)"/>
'''


def save(name, body):
    path = OUT / name
    path.write_text(body + "</svg>\n")
    ET.parse(path)
    print("wrote", path)


def bars_compare():
    # Decode t/s bars - real data
    rows = [
        ("Ornith 35B MoE Q5", 69.27, GREEN),
        ("Qwen35 Q4 MoE", 62.76, CYAN),
        ("Qwen35 Q5 MoE", 61.54, BLUE),
        ("Gemma31 MTP@180W", 26.56, PURPLE),
        ("Qwen27 MTP dense", 25.07, AMBER),
        ("Gemma31 MTP@165W", 24.84, PURPLE),
        ("Gemma31 base@150W", 16.38, RED),
    ]
    w, h = 900, 520
    maxv = 80
    body = svg_root(w, h)
    body += f'<text x="40" y="42" fill="{TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="700">Single-stream decode (engine t/s)</text>\n'
    body += f'<text x="40" y="68" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">Intel Arc Pro B70 32GB · llama.cpp SYCL · 2026-07-16 clean suite</text>\n'
    y0 = 100
    for i, (label, val, color) in enumerate(rows):
        y = y0 + i * 52
        bw = int(720 * (val / maxv))
        body += f'<text x="40" y="{y+18}" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">{label}</text>\n'
        body += f'<rect x="280" y="{y}" width="720" height="28" rx="6" fill="{PANEL}" stroke="{BORDER}"/>\n'
        body += f'<rect x="280" y="{y}" width="{bw}" height="28" rx="6" fill="{color}" opacity="0.35" stroke="{color}"/>\n'
        body += f'<text x="{290+bw}" y="{y+19}" fill="{TEXT}" font-family="ui-monospace,monospace" font-size="13">{val:.1f}</text>\n'
    body += f'<text x="40" y="500" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="12">Source: timings.predicted_per_second · batch=1 · not concurrent aggregate</text>\n'
    save("b70-jul16-decode-bars.svg", body)


def prefill_bars():
    rows = [
        ("Ornith ~4k pp", 1725.9, GREEN),
        ("Qwen35-Q5 ~4k pp", 1690.2, CYAN),
        ("Qwen35-Q4 ~4k pp", 1682.4, BLUE),
        ("Ornith Grok-sys pp", 1300.1, GREEN),
        ("Qwen27 MTP ~4k", 613.0, AMBER),
        ("Gemma31 MTP ~2k", 464.7, PURPLE),
        ("Gemma31 MTP ~4k", 361.2, PURPLE),
        ("Gemma31 base ~4k", 332.9, RED),
    ]
    w, h = 900, 560
    maxv = 1800
    body = svg_root(w, h)
    body += f'<text x="40" y="42" fill="{TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="700">Prefill throughput (engine t/s)</text>\n'
    body += f'<text x="40" y="68" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">Long prompts only · short prompts are overhead-dominated and not charted as peaks</text>\n'
    y0 = 100
    for i, (label, val, color) in enumerate(rows):
        y = y0 + i * 48
        bw = int(700 * (val / maxv))
        body += f'<text x="40" y="{y+18}" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">{label}</text>\n'
        body += f'<rect x="250" y="{y}" width="700" height="26" rx="6" fill="{PANEL}" stroke="{BORDER}"/>\n'
        body += f'<rect x="250" y="{y}" width="{bw}" height="26" rx="6" fill="{color}" opacity="0.35" stroke="{color}"/>\n'
        body += f'<text x="{260+bw}" y="{y+18}" fill="{TEXT}" font-family="ui-monospace,monospace" font-size="13">{val:.0f}</text>\n'
    body += f'<text x="40" y="540" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="12">MoE hits ~1.7k t/s long prefill; dense 31B stays ~330-500 t/s on this SYCL stack</text>\n'
    save("b70-jul16-prefill-bars.svg", body)


def mtp_gain():
    w, h = 880, 420
    body = svg_root(w, h)
    body += f'<text x="40" y="42" fill="{TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="700">Gemma 4 31B dense: MTP-4 effect</text>\n'
    body += f'<text x="40" y="68" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">Same GGUF · Unsloth mtp draft · draft-mtp n-max=4 · single-stream</text>\n'
    # two cards
    body += f'<rect x="60" y="110" width="320" height="220" rx="12" fill="{PANEL}" stroke="{BORDER}"/>\n'
    body += f'<text x="80" y="150" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="14">BASE · 150W · no MTP</text>\n'
    body += f'<text x="80" y="210" fill="{RED}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="48" font-weight="700">16.4</text>\n'
    body += f'<text x="80" y="245" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="14">decode t/s</text>\n'
    body += f'<text x="80" y="290" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">4k prefill 333 t/s</text>\n'

    body += f'<rect x="460" y="110" width="360" height="220" rx="12" fill="{PANEL}" stroke="{GREEN}"/>\n'
    body += f'<text x="480" y="150" fill="{GREEN}" font-family="ui-monospace,monospace" font-size="14">MTP-4 · 165W</text>\n'
    body += f'<text x="480" y="210" fill="{GREEN}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="48" font-weight="700">24.8</text>\n'
    body += f'<text x="480" y="245" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="14">decode t/s  (+51%)</text>\n'
    body += f'<text x="480" y="290" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">4k prefill 361 t/s · draft accept ~0.71</text>\n'

    body += f'<text x="40" y="380" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="12">180W MTP-4 peak in suite: 26.6 decode / 385 prefill (4k). ubatch=256 hurts prefill badly.</text>\n'
    save("b70-jul16-gemma31-mtp-gain.svg", body)


def stack_arch():
    w, h = 920, 480
    body = svg_root(w, h)
    body += f'<text x="40" y="40" fill="{TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="700">B70 local inference path</text>\n'
    boxes = [
        (40, 80, 200, 70, "Grok Build CLI", "tools ON · agent"),
        (280, 80, 200, 70, "llama-server", "OpenAI /v1 :8765"),
        (520, 80, 200, 70, "SYCL + Level Zero", "Arc Pro B70 32GB"),
        (760, 80, 120, 70, "GGUF", "MoE / dense"),
        (40, 220, 260, 90, "profiles.json", "powerWatts + serverArgs"),
        (340, 220, 260, 90, "systemd user", "llama-profile.service"),
        (640, 220, 240, 90, "switch-profile", "idle / model load"),
    ]
    for x, y, bw, bh, t1, t2 in boxes:
        body += f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="10" fill="{PANEL}" stroke="{CYAN}"/>\n'
        body += f'<text x="{x+16}" y="{y+32}" fill="{TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16" font-weight="600">{t1}</text>\n'
        body += f'<text x="{x+16}" y="{y+56}" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="12">{t2}</text>\n'
    # arrows simple lines
    for x1, x2 in [(240, 280), (480, 520), (720, 760)]:
        body += f'<line x1="{x1}" y1="115" x2="{x2}" y2="115" stroke="{CYAN}" stroke-width="2"/>\n'
    body += f'<text x="40" y="370" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">MoE (Ornith/Qwen35): high prefill + decode · Dense (Gemma31/Qwen27): needs MTP-4 for usable decode</text>\n'
    body += f'<text x="40" y="400" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">KV reuse: multi-turn cache_n ~470-489 after system-sized prefix</text>\n'
    body += f'<text x="40" y="440" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="12">Do not mix batch=32 aggregate fleet numbers into single-stream charts.</text>\n'
    save("b70-jul16-inference-stack.svg", body)


def agent_overhead():
    rows = [
        ("Qwen35 direct qs", 11.8, BLUE),
        ("Ornith Grok tools qs", 42.4, GREEN),
        ("Qwen35 Grok tools qs", 52.6, CYAN),
        ("Qwen27 Grok tools qs", 53.4, AMBER),
        ("Gemma31 Grok tools qs", 83.2, PURPLE),
    ]
    w, h = 900, 420
    maxv = 100
    body = svg_root(w, h)
    body += f'<text x="40" y="42" fill="{TEXT}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="22" font-weight="700">Agent wall time vs engine (quicksort task)</text>\n'
    body += f'<text x="40" y="68" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">Grok Build CLI with tools enabled · always-approve · local base_url</text>\n'
    y0 = 100
    for i, (label, val, color) in enumerate(rows):
        y = y0 + i * 48
        bw = int(700 * (val / maxv))
        body += f'<text x="40" y="{y+18}" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="13">{label}</text>\n'
        body += f'<rect x="280" y="{y}" width="700" height="26" rx="6" fill="{PANEL}" stroke="{BORDER}"/>\n'
        body += f'<rect x="280" y="{y}" width="{bw}" height="26" rx="6" fill="{color}" opacity="0.35" stroke="{color}"/>\n'
        body += f'<text x="{290+bw}" y="{y+18}" fill="{TEXT}" font-family="ui-monospace,monospace" font-size="13">{val:.1f}s</text>\n'
    body += f'<text x="40" y="390" fill="{MUTED}" font-family="ui-monospace,monospace" font-size="12">Tools add re-prefills + tool rounds; engine decode is not the whole story.</text>\n'
    save("b70-jul16-agent-overhead.svg", body)


if __name__ == "__main__":
    bars_compare()
    prefill_bars()
    mtp_gain()
    stack_arch()
    agent_overhead()
