/**
 * nav.js — Portfolio runtime orchestration
 *
 * Architecture:
 *   • Global listeners are registered ONCE and survive Astro ViewTransitions
 *     page swaps (the `document` object persists across client-side navigation).
 *   • Per-page DOM bindings are re-attached on every `astro:page-load`.
 *   • Palette visibility uses a CSS class (.is-open) instead of the `hidden`
 *     HTML attribute, because `[hidden]` is overridden by `display: grid` in
 *     the stylesheet — the root cause of the "palette won't close" bug.
 *   • Navigation commands use a synthetic <a> click so Astro's ViewTransitions
 *     router intercepts them (SPA-style) instead of `window.location.href`
 *     which causes a hard full-page reload and re-triggers the boot sequence.
 */
(function () {
  /* ═══════════════════════════════════════════════════════════════════════════
   *  Constants & utilities
   * ═══════════════════════════════════════════════════════════════════════ */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BOOT_COMPLETED_KEY = 'portfolio.boot.completed';

  const getBase = () => {
    const brand = document.querySelector('.site-brand');
    const href = brand ? brand.getAttribute('href') || '/' : '/';
    return href.endsWith('/') ? href : href + '/';
  };

  const normalizePath = (p) => (p.endsWith('/') ? p : p + '/');

  /**
   * Navigate using Astro's ViewTransitions router.
   * We create a temporary <a>, click it, and remove it.  Astro intercepts <a>
   * clicks automatically, so this gives us SPA transitions — no hard reload,
   * no boot replay, no palette-still-showing flash.
   */
  const spaNavigate = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Boot sequence
   * ═══════════════════════════════════════════════════════════════════════ */
  const boot = {
    runId: 0,
    lineTimer: 0,
    failSafeTimer: 0,
    finishTimer: 0,
    escHandler: null,
  };

  const clearBootTimers = () => {
    if (boot.lineTimer) window.clearTimeout(boot.lineTimer);
    if (boot.failSafeTimer) window.clearTimeout(boot.failSafeTimer);
    if (boot.finishTimer) window.clearTimeout(boot.finishTimer);
    boot.lineTimer = 0;
    boot.failSafeTimer = 0;
    boot.finishTimer = 0;
  };

  const detachBootEsc = () => {
    if (boot.escHandler) {
      document.removeEventListener('keydown', boot.escHandler);
      boot.escHandler = null;
    }
  };

  const hasCompletedBoot = () => {
    try { return window.sessionStorage.getItem(BOOT_COMPLETED_KEY) === '1'; } catch { return false; }
  };

  const markBootCompleted = () => {
    try { window.sessionStorage.setItem(BOOT_COMPLETED_KEY, '1'); } catch {}
  };

  /** Immediately hide boot overlay — safe to call at any time. */
  const dismissBoot = () => {
    clearBootTimers();
    detachBootEsc();
    const shell = document.querySelector('[data-boot-sequence]');
    if (shell) shell.classList.add('done');
    document.body.classList.remove('booting');
  };

  const runBootSequence = ({ force = false } = {}) => {
    const shell = document.querySelector('[data-boot-sequence]');
    const output = document.querySelector('[data-boot-output]');
    const progressBar = document.querySelector('[data-boot-progress]');
    const progressText = document.querySelector('[data-boot-percent]');
    const gate = document.querySelector('[data-boot-gate]');
    const gateInput = document.querySelector('[data-boot-gate-input]');

    if (!shell || !output || !progressBar || !progressText || !gate || !gateInput) return;

    /* Guard: skip if already played this session (unless forced). */
    if (!force && hasCompletedBoot()) {
      dismissBoot();
      return;
    }

    boot.runId += 1;
    const currentRun = boot.runId;
    clearBootTimers();
    detachBootEsc();

    const gateEnabled = window.localStorage.getItem('portfolio.boot.gate') === '1';

    output.innerHTML = '';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    gate.hidden = true;
    gateInput.value = '';
    shell.classList.remove('done');
    shell.classList.remove('gate-error');
    shell.classList.toggle('gate-enabled', gateEnabled);
    document.body.classList.add('booting');

    const bootLines = [
      '$ date -Ins',
      '$ uname -a',
      'Linux rhel-core-01 5.14.0-503.35.1.el9_5.x86_64 #1 SMP PREEMPT_DYNAMIC',
      '$ systemctl is-system-running',
      'running',
      '$ nmcli -t -f STATE g',
      'connected',
      '$ ssh -o BatchMode=yes sergiio@rhel-core-01',
      '[ssh] handshake established · curve25519-sha256',
      '[auth] publickey accepted for sergiio',
      '$ ansible all -m ping --one-line',
      '128 hosts reachable · 0 unreachable',
      '$ podman ps --format "table {{.Names}}\t{{.Status}}"',
      'inference-gw\tUp 2h',
      '$ ./serve-llm --healthcheck qwen3.5-edge',
      '[ai] model runtime warmed · deterministic policy active',
      '[ok] engineer cockpit ready',
    ];

    const setProgress = (v) => {
      const n = Math.max(0, Math.min(100, v));
      progressBar.style.width = n + '%';
      progressText.textContent = Math.round(n) + '%';
    };

    const finalizeBoot = () => {
      if (currentRun !== boot.runId) return;
      dismissBoot();
      markBootCompleted();
      window.dispatchEvent(new CustomEvent('portfolio-boot-complete'));
    };

    const skipBoot = () => { setProgress(100); finalizeBoot(); };

    shell.onclick = skipBoot;
    boot.escHandler = (e) => { if (e.key === 'Escape') skipBoot(); };
    document.addEventListener('keydown', boot.escHandler);

    gateInput.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      if (gateInput.value.trim().toLowerCase() === 'unlock') { skipBoot(); return; }
      shell.classList.add('gate-error');
      window.setTimeout(() => shell.classList.remove('gate-error'), 260);
      gateInput.select();
    };

    const appendLine = (text) => {
      const line = document.createElement('div');
      line.className = 'boot-line';
      if (text.includes('[ok]')) line.classList.add('boot-ok');
      if (text.includes('[warn]')) line.classList.add('boot-warn');
      if (text.includes('[ssh]') || text.includes('[auth]')) line.classList.add('boot-accent');
      if (text.startsWith('$')) line.classList.add('boot-accent');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    if (prefersReducedMotion && !force) {
      appendLine('[ok] reduced-motion profile active · instant ready');
      setProgress(100);
      boot.finishTimer = window.setTimeout(finalizeBoot, 120);
      return;
    }

    let lineIndex = 0;
    const tick = () => {
      if (currentRun !== boot.runId) return;
      if (lineIndex >= bootLines.length) {
        setProgress(100);
        if (gateEnabled) { gate.hidden = false; gateInput.focus(); return; }
        boot.finishTimer = window.setTimeout(finalizeBoot, 260);
        return;
      }
      appendLine(bootLines[lineIndex]);
      lineIndex += 1;
      setProgress((lineIndex / bootLines.length) * 100);
      boot.lineTimer = window.setTimeout(tick, 95 + Math.random() * 85);
    };

    boot.failSafeTimer = window.setTimeout(() => {
      if (currentRun === boot.runId) { setProgress(100); finalizeBoot(); }
    }, 9000);

    tick();
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Command palette
   *
   *  Visibility is controlled via the CSS class `.is-open` on the palette
   *  element, NOT the `hidden` HTML attribute.  The previous implementation
   *  used `hidden`, but CSS `display: grid` on `.command-palette` silently
   *  overrode it — so closing the palette via `el.hidden = true` had zero
   *  visual effect.
   * ═══════════════════════════════════════════════════════════════════════ */
  let paletteIsOpen = false;
  let globalPaletteListenersBound = false;

  const closePalette = () => {
    paletteIsOpen = false;
    const el = document.querySelector('[data-command-palette]');
    if (el) el.classList.remove('is-open');
    document.body.classList.remove('palette-open');
  };

  const openPalette = () => {
    const el = document.querySelector('[data-command-palette]');
    if (!el) return;
    paletteIsOpen = true;
    el.classList.add('is-open');
    document.body.classList.add('palette-open');
    const input = el.querySelector('[data-command-palette-input]');
    if (input) { input.value = ''; input.focus(); }
    renderCommands('');
  };

  const togglePalette = () => { paletteIsOpen ? closePalette() : openPalette(); };

  /** Close palette, then run a command after the close paints. */
  const execCommand = (cmd) => {
    closePalette();
    requestAnimationFrame(() => cmd.run());
  };

  /* ─── commands (no DOM dependency, rebuilt each page load) ─── */
  let commands = [];

  const buildCommands = () => {
    const base = getBase();

    /**
     * Scroll to an element on the current page, or SPA-navigate to
     * the home page with a hash if the element doesn't exist yet.
     */
    const scrollOrNav = (elementId) => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + elementId);
        return;
      }
      spaNavigate(base + '#' + elementId);
    };

    commands = [
      {
        id: 'nav-home',
        label: 'Go to Home',
        tags: 'navigation home index',
        run: () => {
          /* If already on homepage, scroll to top instead of navigating. */
          if (normalizePath(window.location.pathname) === normalizePath(new URL(base, window.location.origin).pathname)) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          spaNavigate(base);
        },
      },
      {
        id: 'nav-archive',
        label: 'Go to Archive',
        tags: 'navigation archive posts',
        run: () => spaNavigate(base + 'archive/'),
      },
      {
        id: 'nav-about',
        label: 'Go to About',
        tags: 'navigation about cv profile',
        run: () => spaNavigate(base + 'about/'),
      },
      {
        id: 'nav-recruiter',
        label: 'Go to Recruiter Snapshot',
        tags: 'navigation recruiter hiring summary profile fit',
        run: () => scrollOrNav('recruiter-view'),
      },
      {
        id: 'nav-topology',
        label: 'Go to Network Topology',
        tags: 'navigation network topology latency map',
        run: () => scrollOrNav('network-topology'),
      },
      {
        id: 'mode-hardcore',
        label: 'Enable Hardcore Mode',
        tags: 'mode hardcore glitch intense',
        run: () => {
          window.localStorage.setItem('portfolio-mode', 'hardcore');
          document.body.classList.add('hardcore-mode');
          window.dispatchEvent(new CustomEvent('portfolio-request-mode', { detail: { mode: 'hardcore' } }));
        },
      },
      {
        id: 'mode-normal',
        label: 'Enable Normal Mode',
        tags: 'mode normal calm',
        run: () => {
          window.localStorage.setItem('portfolio-mode', 'normal');
          document.body.classList.remove('hardcore-mode');
          window.dispatchEvent(new CustomEvent('portfolio-request-mode', { detail: { mode: 'normal' } }));
        },
      },
      {
        id: 'audience-recruiter',
        label: 'Switch to Recruiter Mode',
        tags: 'audience recruiter hiring concise',
        run: () => {
          window.localStorage.setItem('portfolio.audience.mode', 'recruiter');
          document.body.classList.add('audience-recruiter');
          document.body.classList.remove('audience-engineer');
          window.dispatchEvent(new CustomEvent('portfolio-request-audience', { detail: { mode: 'recruiter' } }));
        },
      },
      {
        id: 'audience-engineer',
        label: 'Switch to Engineer Mode',
        tags: 'audience engineer labs technical',
        run: () => {
          window.localStorage.setItem('portfolio.audience.mode', 'engineer');
          document.body.classList.add('audience-engineer');
          document.body.classList.remove('audience-recruiter');
          window.dispatchEvent(new CustomEvent('portfolio-request-audience', { detail: { mode: 'engineer' } }));
        },
      },
      {
        id: 'boot-replay',
        label: 'Replay Boot Sequence',
        tags: 'boot preloader ssh startup replay',
        run: () => runBootSequence({ force: true }),
      },
      {
        id: 'boot-gate',
        label: 'Toggle Boot Unlock Gate',
        tags: 'boot unlock gate type unlock security',
        run: () => {
          const key = 'portfolio.boot.gate';
          const on = window.localStorage.getItem(key) === '1';
          window.localStorage.setItem(key, on ? '0' : '1');
          window.dispatchEvent(new CustomEvent('portfolio-boot-gate-change', { detail: { enabled: !on } }));
        },
      },
    ];
  };

  /* ─── render / interaction helpers ─── */
  const renderCommands = (query) => {
    const list = document.querySelector('[data-command-palette-list]');
    if (!list) return;
    const q = (query || '').trim().toLowerCase();
    const filtered = commands.filter((c) => {
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || c.tags.toLowerCase().includes(q);
    });
    if (filtered.length === 0) {
      list.innerHTML = '<div class="command-item-empty">No command matched.</div>';
      return;
    }
    list.innerHTML = filtered
      .map((c, i) =>
        '<button type="button" class="command-item' + (i === 0 ? ' active' : '') + '" data-cmd-id="' + c.id + '">' + c.label + '</button>'
      )
      .join('');
  };

  const moveActive = (dir) => {
    const list = document.querySelector('[data-command-palette-list]');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('.command-item'));
    if (items.length === 0) return;
    const cur = items.findIndex((i) => i.classList.contains('active'));
    const next = cur < 0 ? 0 : (cur + dir + items.length) % items.length;
    items.forEach((i) => i.classList.remove('active'));
    items[next].classList.add('active');
    items[next].scrollIntoView({ block: 'nearest' });
  };

  const runActiveCommand = () => {
    const list = document.querySelector('[data-command-palette-list]');
    if (!list) return;
    const active = list.querySelector('.command-item.active');
    if (!active) return;
    const id = active.getAttribute('data-cmd-id');
    const cmd = commands.find((c) => c.id === id);
    if (cmd) execCommand(cmd);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Global listeners (registered exactly ONCE, survive page swaps)
   * ═══════════════════════════════════════════════════════════════════════ */
  const bindGlobalListeners = () => {
    if (globalPaletteListenersBound) return;
    globalPaletteListenersBound = true;

    /* Ctrl/Cmd+K to toggle, Escape to close */
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (e.key === 'Escape' && paletteIsOpen) {
        e.preventDefault();
        closePalette();
      }
    });

    /* Close when any anchor is clicked (capture phase) */
    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('a[href]')) closePalette();
    }, true);

    /* Close on URL changes */
    window.addEventListener('hashchange', closePalette);
    window.addEventListener('popstate', closePalette);

    /* Astro ViewTransitions: close before DOM swap (persists across swaps) */
    document.addEventListener('astro:before-swap', closePalette);

    /* External event to open palette */
    window.addEventListener('portfolio-open-palette', openPalette);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Per-page palette DOM bindings (runs on every page load)
   * ═══════════════════════════════════════════════════════════════════════ */
  const bindPalettePage = () => {
    const el = document.querySelector('[data-command-palette]');
    if (!el) return;

    /* Ensure palette starts closed on every new page */
    el.classList.remove('is-open');
    paletteIsOpen = false;
    document.body.classList.remove('palette-open');

    /* Backdrop / close-button clicks */
    el.addEventListener('mousedown', (e) => {
      if (e.target === el || (e.target instanceof Element && e.target.hasAttribute('data-command-palette-close'))) {
        closePalette();
      }
    });

    el.querySelectorAll('[data-command-palette-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.preventDefault(); closePalette(); });
    });

    /* Input filtering */
    const input = el.querySelector('[data-command-palette-input]');
    if (input) {
      input.addEventListener('input', () => renderCommands(input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
        if (e.key === 'Enter') { e.preventDefault(); runActiveCommand(); }
      });
    }

    /* Command button clicks (delegated on list container) */
    const list = el.querySelector('[data-command-palette-list]');
    if (list) {
      list.addEventListener('click', (e) => {
        if (!(e.target instanceof HTMLElement)) return;
        const btn = e.target.closest('.command-item');
        if (!btn) return;
        const id = btn.getAttribute('data-cmd-id');
        const cmd = commands.find((c) => c.id === id);
        if (cmd) execCommand(cmd);
      });
    }

    /* Initial render */
    renderCommands('');
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Sidebar
   * ═══════════════════════════════════════════════════════════════════════ */
  const initSidebar = () => {
    const sidebar = document.querySelector('[data-sidebar]');
    const toggle = document.querySelector('[data-menu-toggle]');
    const overlay = document.querySelector('[data-overlay]');
    if (!sidebar || !toggle || !overlay) return;
    if (toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    const setOpen = (open) => {
      sidebar.classList.toggle('open', open);
      overlay.classList.toggle('active', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
    overlay.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    sidebar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 960px)').matches) setOpen(false);
      });
    });
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Reveal (scroll-triggered entrance animations)
   * ═══════════════════════════════════════════════════════════════════════ */
  const initReveal = () => {
    const selectors = [
      '.hero', '.section-block', '.timeline-item', '.skill-card',
      '.principles-grid .panel', '.engineer-lab', '.network-panel',
    ];
    const elements = document.querySelectorAll(selectors.join(','));
    if (elements.length === 0) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    elements.forEach((el, i) => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i * 26, 170) + 'ms';
      observer.observe(el);
    });
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Page init (runs on every Astro page load)
   * ═══════════════════════════════════════════════════════════════════════ */
  const initPage = () => {
    /* 1. Immediately guarantee overlays are closed */
    closePalette();
    dismissBoot();

    /* 2. Boot (sessionStorage-guarded) */
    runBootSequence();

    /* 3. Palette */
    buildCommands();
    bindGlobalListeners();   /* no-op after first call */
    bindPalettePage();

    /* 4. Other systems */
    initSidebar();
    initReveal();

    /* 5. Audience buttons */
    document.querySelectorAll('[data-set-audience]').forEach((btn) => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-set-audience');
        if (mode) window.dispatchEvent(new CustomEvent('portfolio-request-audience', { detail: { mode } }));
      });
    });
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Entry points
   * ═══════════════════════════════════════════════════════════════════════ */
  let initialized = false;

  document.addEventListener('astro:page-load', () => {
    initialized = true;
    initPage();
  });

  window.addEventListener('load', () => {
    if (!initialized) initPage();
  }, { once: true });
})();
