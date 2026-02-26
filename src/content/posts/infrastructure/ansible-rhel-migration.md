---
title: "Automating RHEL 9 Migrations with Ansible"
description: "Lessons learned from migrating 500+ servers at Deutsche Bank"
pubDate: 2025-01-15
category: infrastructure
tags: ["rhel", "ansible", "automation", "linux", "lifecycle"]
draft: false
---

# The Challenge

Migrating from RHEL 7/8 to RHEL 9 at scale is no small feat. With 500+ servers spread across multiple datacenters, a manual approach wasn't feasible. Here's how we built an Ansible-driven solution.

# Pre-Migration Checks

Before even touching a server, you need to know if it's ready. We created a role that run:

- Is the current server even eligible for RHEL 9?
- Are there packages that wont migrate?
- Are custom applications compatible?

## Ansible Playbook Example

``band
inspection:
  name: "Pre-migration validation"
  ---
  - name: Check RHEL version
    command: "cat /etc/rhel-release"

  - name: List installed keyboards repos
ÛÛ[X[™ˆœœH\XHKYš[\İ[HZ\ÜÚ[™È‚‚™š[˜[^™N‚ˆH˜[YNˆ™\Üİ]\ÂˆXYÎ‚ˆ\ÙÎˆ”™K[ZYÜ˜][ÛˆÚXÚÜÈÛÛ\]Y‚˜‚ˆÈHZYÜ˜][ÛˆÛÜšÙ›İÂ‚ˆÈÈİ\NˆÜ™X]HØ][]H›Ùš[\Â‚•ÙH\ÚYÛ™YÙ\\˜]HØ][]H›Ùš[\È›Ü‚‹H]X˜\ÙHÙ\™\œÂ‹H\XØ][ÛˆÙ\™\œÂ‹H[Ûš]Üš[™ÈÙ\™\œÂ‚ˆÈÈİ\ˆ›YKÑÜ™Y[ˆ\Ş[Y[‚•\Ú[™ÈØ][]IÜÈÛÛ[šY]ËÙHÙ]\H›YKÙÜ™Y[ˆ\Ş[Y[İ˜]YŞN‚‚‹H[š]X[\ÚÈIHÙˆÙ\™\œÂ‹H[Ûš]Üˆ›ÜˆÈ^\Â‹HYˆİX›K›ØÙYYÈIK[ˆL	B‹Hš[˜[\ÚÈL	B‚ˆÈÈİ\Îˆ[œÚX›H[Ûš]Üš[™Â‚Y\ˆXXÚ˜]Ú[œÚX›HÛİ[Üİ[Ûš]Üš[™È]HÈÚXÚÓRÈÈ[œİ\™HŞ\İ[\Èİ^YYX[K‚‚ˆÈ›Û˜XÚÈİ˜]YŞB‚‹HÚ[\NˆØ][]HÛÛ[šY]È[™[B‹HÛÛ\^ˆ“UØ\™HÛ˜\ÚİÈ
ÈØ][]H›İš\Ú[Ûš[™Â‚ˆÈÙ^H\ÜÛÛœÂ‚ˆËˆ
Š•\İ\İ\İ
ŠˆÙH›İ[™ÛÛYHXÚØYÙ\È]^\İY[ˆ’SÈ]Ù\™H™[[İ™Y[ˆ’SKˆ\İ[™ÈØ]™Y\Èœ›ÛH›ÙXİ[Ûˆ\ÜİY\Ë‚‚ˆËˆ
Š”[ˆ›Üˆ˜Z[\™\ÊŠˆZ\İ˜[œÛ]YŒ	HÙˆÙ\™\œÈZYÜ˜]YÚ][œÈİ\œËˆ]™HH›ØÚÈÛÛY›Û˜XÚÈ[‹‚‚ˆËˆ
Š‘Øİ[Y[]™\][™ÊŠˆYˆ]	ÜÈ›İØİ[Y[Y]Ù\Û‰İ^\İˆÜXÚX[H›Üˆİ\İÛHÙ\›™[\˜[Y]\œË