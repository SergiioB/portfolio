---
title: "Qwen3.8-27B on Windows 11 + Arc Pro B70: the 19 August upgrade"
description: "If you already have Ian Hudson’s Windows kit running Qwen3.8-27B on the B70, you do not reinstall. Rebuild image 2026.08.19, recreate the container, leave prefix cache on for real chat. Linux on the same overlay is 112.65 vs 81.20 tok/s C1."
situation: "The Windows 11 Docker Desktop kit already served Qwen3.8-27B GPTQ-INT4 + MTP4 on a display-attached Arc Pro B70 at about 70 tok/s. Linux then shipped a draft-INT4 overlay that made the same model faster without a new download."
issue: "Restarting the old container does not pick up new patches. Prefix cache was off because that matches a cold decode card, which is the wrong default for real multi-turn sessions."
solution: "Image tag 2026.08.19 applies mixed-split v5 plus draft-INT4 S+M1, turns prefix cache on, and ships Upgrade-Qwen38-Docker.ps1 so the container is recreated. Same model files, same 4.25 GiB display-safe KV pin."
usedIn: "Windows 11 Docker Desktop kit in the Intel Arc Pro B70 inference cookbook, same public image digest as the Linux Qwen3.8 recipe."
impact: "Linux C1 n=5, cache off, p512/g128: 112.65 vs matched BF16-draft 81.20 tok/s. Windows 18 August self-report stays ~70 until the overlay is re-measured there. Serving default is now prefix cache on."
pubDate: 2026-08-19
category: ["b70", "local-ai", "infrastructure"]
amazonUrl: https://go.sergiiob.dev/arc-pro
tags:
  [
    "local-ai",
    "intel-arc",
    "arc-pro-b70",
    "windows",
    "docker",
    "vllm",
    "xpu",
    "qwen",
    "qwen3.8",
    "mtp",
    "gptq",
    "int4",
  ]
draft: false
---

If you already followed
[Windows 11 hosts — Qwen3.8-27B](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/master/docs/qwen38-27/WINDOWS-STANDALONE.md)
you are done with the hard part. Docker Desktop is installed. The 18 GB
model is on disk. The server answers at `http://127.0.0.1:8000/v1`.

This is the next image, not a new kit.

The kits were devised and end-to-end tested by **Ian Hudson
([aitesthive.com](https://aitesthive.com))** on 18 August. The 19 August
overlay is the same digest, same checkpoint, three extra patches, and
prefix cache **on** for real sessions.

Cookbook:

- [Windows standalone guide](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/master/docs/qwen38-27/WINDOWS-STANDALONE.md)
- [Qwen3.8 vLLM XPU recipe](https://github.com/SergiioB/intel-arc-pro-b70-inference-cookbook/blob/master/docs/qwen38-27/QWEN38-VLLM-XPU.md)
- Model: [SergiioB/Qwen3.8-27B-GPTQ-Int4-sym-G128-MTP-BF16](https://huggingface.co/SergiioB/Qwen3.8-27B-GPTQ-Int4-sym-G128-MTP-BF16)

## What you get

|                        | 18 August kit                                                 | 19 August image                                |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Model files            | already on disk                                               | **reuse them**                                 |
| Display-safe VRAM      | 0.75 + 4.25 GiB fp8 KV, 100K                                  | unchanged                                      |
| Draft                  | BF16 MTP head as stored                                       | same files; draft requantized to INT4 at start |
| Prefix cache           | off                                                           | **on** (chat, tools, system prompt)            |
| Linux C1 p512/g128 n=5 | 81.20 matched BF16-draft arm (83.7 on the published BF16 row) | **112.65** draft-INT4, cache off               |

Do **not** copy 112.65 onto a Windows table. Ian’s Docker number was ~70
tok/s on the 18 August BF16-draft kit (self-report, one machine). Re-run
`.\Test-CookbookDecode.ps1` after the rebuild if you want a Windows
number.

Prefix cache does not make the first unique prompt faster. It is for the
turns after that. Leave it on for Open WebUI, Pi, anything with a system
prompt. Turn it off only for a cold unique-prompt decode test.

## Docker Desktop — the actual steps

Work in the kit folder. If you cloned the cookbook that is
`windows/Qwen38-Docker-Standalone/`. If you unzipped Ian’s zip, pull or
copy the updated scripts into that folder first.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Upgrade-Qwen38-Docker.ps1
```

That is the whole upgrade:

1. Builds `qwen38-b70-docker:2026.08.19` (five hash-checked patches).
2. **Deletes** the old `qwen38-b70-docker-test` container.
3. Starts a new one with draft-INT4 on and prefix cache on.
4. Leaves `.\models\Qwen3.8-27B-GPTQ-Int4` alone.

Restarting the 18 August container is **not** an upgrade. Docker keeps
the old entrypoint until you recreate.

Manual equivalent:

```powershell
.\Build-Qwen38Image-Docker.ps1
.\Start-Qwen38-Docker.ps1 -Recreate
```

Confirm the overlay actually ran:

```powershell
docker logs qwen38-b70-docker-test | findstr /C:"draft-INT4"
```

You want:

```text
[start] draft-INT4 S+M1 overlay ENABLED
```

Cold decode test (prefix cache off, matches the Linux speed card):

```powershell
.\Start-Qwen38-Docker.ps1 -Recreate -PrefixCache 0
.\Test-CookbookDecode.ps1
```

Then put prefix cache back on for daily use:

```powershell
.\Start-Qwen38-Docker.ps1 -Recreate
```

Back to the 18 August draft (same model files):

```powershell
.\Start-Qwen38-Docker.ps1 -Recreate -DraftInt4 0
```

Endpoint is still `http://127.0.0.1:8000/v1`, model name `qwen38`.

## WSLC — only if that is the kit you run

WSLC stays the experimental path (~26 tok/s on 18 August). Same overlay,
same recreate idea:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Upgrade-Qwen38-WSLC.ps1
```

Confirm with `wslc logs qwen38-b70-friendly`. This overlay does not fix
the WSLC slowdown.

## Fresh machine (no 18 August kit)

Install Docker Desktop with the Linux/WSL 2 engine, then:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Setup-Qwen38-Docker.ps1
```

Setup now builds **2026.08.19**. You still wait through the first model
download (~18.2 GiB) and the tea-length load from the Windows bind mount.

## What not to change

- Do not raise `GPU_MEMORY_UTILIZATION` above **0.75** or drop the
  **4.25 GiB** KV pin on a display-attached B70. Ian already measured the
  failure: auto-sized KV ate the desktop and decode fell to ~26 tok/s.
- Do not publish 112.65 as a Windows result.
- Do not overwrite the Linux BF16-draft LocalMaxxing row (83.7). Draft-INT4
  is a second row.

Sampling follows the checkpoint (`--generation-config auto`): thinking
1.0 / 0.95 / 20; non-thinking 0.7 / 0.80 / 20 with presence penalty 1.5.
That is what Qwen documents, not greedy.
