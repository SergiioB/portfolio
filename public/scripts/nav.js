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
  const AUDIENCE_KEY = 'portfolio.audience.mode';
  const LANG_KEY = 'portfolio.lang';

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
   *  i18n runtime — language state + translation helper
   * ═══════════════════════════════════════════════════════════════════════ */
  const getLang = () => {
    try { return window.localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'; } catch { return 'en'; }
  };

  let currentLang = getLang();

  /** Translate a key using the injected dictionary `window.__i18n`. */
  const T = (key) => {
    const dict = window.__i18n;
    if (!dict || !dict[key]) return key;
    return dict[key][currentLang] || dict[key].en || key;
  };

  /** Swap all `[data-i18n]` elements on the page to the current language.
   *  Safety: if T(key) returns the key itself (dict missing / CSP block),
   *  we leave the SSR-rendered text untouched. */
  const applyI18nDom = () => {
    const dictReady = !!window.__i18n;
    if (!dictReady) return;  /* dict not loaded, keep SSR text */
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = T(key);
      if (text === key) return;  /* translation missing, keep existing text */
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.setAttribute('placeholder', text);
      } else {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      const text = T(key);
      if (text !== key) el.setAttribute('placeholder', text);
    });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-label');
      if (!key) return;
      const text = T(key);
      if (text !== key) el.setAttribute('aria-label', text);
    });
    document.documentElement.lang = currentLang;
  };

  const setLang = (lang) => {
    currentLang = lang === 'es' ? 'es' : 'en';
    try { window.localStorage.setItem(LANG_KEY, currentLang); } catch { }
    applyI18nDom();
    buildCommands();
    renderCommands('');
    const audience = document.body.classList.contains('audience-engineer') ? 'engineer' : 'recruiter';
    applyAudienceMode(audience, false);

    /* Re-render typewriter text instantly on language switch */
    const twEl = document.getElementById('typewriter');
    if (twEl) {
      twEl.textContent = T('hero.typewriter');
      const h1 = document.getElementById('home-hero-title');
      if (h1) h1.setAttribute('data-text', T('hero.typewriter') + '_');
    }

    /* Swap CV link to language-specific version */
    const cvLink = document.getElementById('cv-action-link');
    if (cvLink) {
      const newHref = cvLink.getAttribute(`data-href-${currentLang}`);
      if (newHref) cvLink.setAttribute('href', newHref);
    }

    window.dispatchEvent(new CustomEvent('portfolio-lang-change', { detail: { lang: currentLang } }));
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Console Easter egg
   * ═══════════════════════════════════════════════════════════════════════ */
  let easterEggPrinted = false;
  const printConsoleEgg = () => {
    if (easterEggPrinted) return;
    easterEggPrinted = true;
    const art = [
      '%c┌─────────────────────────────────────────────────┐',
      '│  sergio@portfolio:~$ cat /etc/motd               │',
      '│                                                   │',
      '│  ███████╗███████╗██████╗  ██████╗ ██╗ ██████╗    │',
      '│  ██╔════╝██╔════╝██╔══██╗██╔════╝ ██║██╔═══██╗   │',
      '│  ███████╗█████╗  ██████╔╝██║  ███╗██║██║   ██║   │',
      '│  ╚════██║██╔══╝  ██╔══██╗██║   ██║██║██║   ██║   │',
      '│  ███████║███████╗██║  ██║╚██████╔╝██║╚██████╔╝   │',
      '│  ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝   │',
      '│                                                   │',
      '│  Nice! You opened DevTools. Try Ctrl+K for the   │',
      '│  command palette, or type "mode hardcore" in the  │',
      '│  Ops Cockpit CLI.                                 │',
      '│                                                   │',
      '│  Stack: Astro 5 · Vanilla JS · Zero frameworks    │',
      '│  i18n: EN/ES · State: localStorage + body classes  │',
      '│                                                   │',
      '└─────────────────────────────────────────────────┘',
    ].join('\n');
    console.log(art, 'color: #7ee787; font-family: monospace; font-size: 11px;');
    console.log(
      '%c💡 Tip: This site is fully bilingual (EN/ES). Use the language toggle or Ctrl+K → "Switch language".',
      'color: #58a6ff; font-size: 11px;'
    );
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
    try { window.sessionStorage.setItem(BOOT_COMPLETED_KEY, '1'); } catch { }
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

    /* UX improvement: skip boot entirely for recruiter-mode visitors */
    if (!force) {
      try {
        const audience = window.localStorage.getItem(AUDIENCE_KEY);
        if (audience !== 'engineer') {
          dismissBoot();
          markBootCompleted();
          return;
        }
      } catch { }
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
      { text: '── PHASE 1: KERNEL ──────────────────────────', type: 'phase' },
      { text: '$ uname -a', type: 'cmd' },
      { text: 'Linux rhel-core-01 5.14.0-503.35.1.el9_5.x86_64 #1 SMP PREEMPT_DYNAMIC', type: '' },
      { text: '$ systemctl is-system-running', type: 'cmd' },
      { text: 'running', type: 'ok' },
      { text: '── PHASE 2: NETWORK ─────────────────────────', type: 'phase' },
      { text: '$ nmcli -t -f STATE g', type: 'cmd' },
      { text: 'connected', type: 'ok' },
      { text: '$ ssh -o BatchMode=yes sergiio@rhel-core-01', type: 'cmd' },
      { text: '[ssh] curve25519-sha256 handshake ✓', type: 'accent' },
      { text: '[auth] publickey accepted for sergiio', type: 'accent' },
      { text: '── PHASE 3: ORCHESTRATION ───────────────────', type: 'phase' },
      { text: '$ ansible all -m ping --one-line', type: 'cmd' },
      { text: '128 hosts reachable · 0 unreachable', type: '' },
      { text: '$ podman ps --format "{{.Names}}\\t{{.Status}}"', type: 'cmd' },
      { text: 'inference-gw   Up 2h  ✓', type: 'ok' },
      { text: '── PHASE 4: AI RUNTIME ──────────────────────', type: 'phase' },
      { text: '$ ./serve-llm --healthcheck qwen3.5-edge', type: 'cmd' },
      { text: '[ai] model runtime warmed · deterministic policy active', type: 'accent' },
      { text: '[ok] all systems nominal · cockpit ready', type: 'ready' },
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

    const appendLine = (entry) => {
      const text = typeof entry === 'string' ? entry : entry.text;
      const type = typeof entry === 'string' ? '' : (entry.type || '');
      const line = document.createElement('div');
      line.className = 'boot-line';
      if (type === 'phase') line.classList.add('boot-phase');
      else if (type === 'cmd') line.classList.add('boot-accent');
      else if (type === 'ok') line.classList.add('boot-ok');
      else if (type === 'accent') line.classList.add('boot-accent');
      else if (type === 'ready') line.classList.add('boot-ready');
      else if (text.includes('[ok]')) line.classList.add('boot-ok');
      else if (text.includes('[warn]')) line.classList.add('boot-warn');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    if (prefersReducedMotion && !force) {
      appendLine({ text: '[ok] reduced-motion profile active · instant ready', type: 'ok' });
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
      const entry = bootLines[lineIndex];
      appendLine(entry);
      lineIndex += 1;
      setProgress((lineIndex / bootLines.length) * 100);
      /* Phase headers get a brief pause; commands are fast */
      const delay = entry.type === 'phase' ? 140 + Math.random() * 60
        : entry.type === 'ready' ? 180
          : 55 + Math.random() * 65;
      boot.lineTimer = window.setTimeout(tick, delay);
    };

    boot.failSafeTimer = window.setTimeout(() => {
      if (currentRun === boot.runId) { setProgress(100); finalizeBoot(); }
    }, 5000);

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
  /* ═══════════════════════════════════════════════════════════════════════════
   *  Toast notification system
   * ═══════════════════════════════════════════════════════════════════════ */
  const showToast = (message) => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      window.setTimeout(() => toast.remove(), 300);
    }, 2400);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Scroll progress bar
   * ═══════════════════════════════════════════════════════════════════════ */
  let scrollProgressBound = false;
  const initScrollProgress = () => {
    let bar = document.querySelector('.scroll-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'scroll-progress-bar';
      document.body.appendChild(bar);
    }
    if (!scrollProgressBound) {
      scrollProgressBound = true;
      window.addEventListener('scroll', () => {
        const b = document.querySelector('.scroll-progress-bar');
        if (!b) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        b.style.width = progress + '%';
      }, { passive: true });
    }
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Animated stat counters (hero section)
   * ═══════════════════════════════════════════════════════════════════════ */
  const initAnimatedCounters = () => {
    const counters = document.querySelectorAll('[data-count-to]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count-to'), 10);
        if (isNaN(target)) return;
        const duration = 1200;
        const start = performance.now();
        const tick = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          /* Ease out cubic */
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased);
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.3 });

    counters.forEach((c) => observer.observe(c));
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Sidebar session uptime counter
   * ═══════════════════════════════════════════════════════════════════════ */
  let uptimeInterval = 0;
  const sessionStart = Date.now();

  const initUptimeCounter = () => {
    if (uptimeInterval) window.clearInterval(uptimeInterval);
    const update = () => {
      const el = document.querySelector('[data-uptime]');
      if (!el) return;
      const s = Math.floor((Date.now() - sessionStart) / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      el.textContent = h > 0
        ? h + 'h ' + (m % 60) + 'm ' + (s % 60) + 's'
        : m > 0
          ? m + 'm ' + (s % 60) + 's'
          : s + 's';
    };
    update();
    uptimeInterval = window.setInterval(update, 1000);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Audience mode (Recruiter / Engineer) — centralised state management
   *
   *  Every audience toggle on the page funnels through applyAudienceMode().
   *  This avoids depending on Astro-bundled module scripts that may race
   *  against the page-load event.
   * ═══════════════════════════════════════════════════════════════════════ */
  const applyAudienceMode = (mode, persist = true) => {
    const normalized = mode === 'engineer' ? 'engineer' : 'recruiter';

    document.body.classList.toggle('audience-engineer', normalized === 'engineer');
    document.body.classList.toggle('audience-recruiter', normalized === 'recruiter');

    /* Sync AudienceMode component tab buttons */
    document.querySelectorAll('[data-audience-mode]').forEach((btn) => {
      const isActive = btn.getAttribute('data-audience-mode') === normalized;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    /* Sync status text */
    document.querySelectorAll('[data-audience-status]').forEach((el) => {
      el.textContent = normalized === 'engineer' ? T('audience.currentEngineer') : T('audience.currentRecruiter');
    });

    if (persist) {
      try { window.localStorage.setItem(AUDIENCE_KEY, normalized); } catch { }
    }

    window.dispatchEvent(new CustomEvent('portfolio-audience-change', { detail: { mode: normalized } }));
  };

  const initAudienceButtons = () => {
    /* Bind [data-set-audience] buttons (teaser "Switch to Engineer Mode", etc.) */
    document.querySelectorAll('[data-set-audience]').forEach((btn) => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-set-audience');
        if (mode) applyAudienceMode(mode);
      });
    });

    /* Bind [data-audience-mode] tab buttons (AudienceMode component) */
    document.querySelectorAll('[data-audience-mode]').forEach((btn) => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-audience-mode') || 'recruiter';
        applyAudienceMode(mode);
      });
    });
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Typewriter (WHOAMI hero title)
   *
   *  Moved here from an Astro component <script> to guarantee execution —
   *  nav.js initialises via a plain `defer` <script> with a window.load
   *  fallback, so it never misses the page-load event.
   * ═══════════════════════════════════════════════════════════════════════ */
  const initTypewriter = () => {
    const el = document.getElementById('typewriter');
    if (!el || el.dataset.typed) return;
    el.dataset.typed = 'true';

    const text = T('hero.typewriter');
    const h1 = document.getElementById('home-hero-title');
    let i = 0;

    /* prefers-reduced-motion: show text instantly */
    if (prefersReducedMotion) {
      el.textContent = text;
      if (h1) { h1.setAttribute('data-text', text + '_'); h1.classList.add('glitch'); }
      return;
    }

    function type() {
      /* Pause typing while boot overlay is active */
      if (document.body.classList.contains('booting')) {
        window.addEventListener('portfolio-boot-complete', type, { once: true });
        return;
      }
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, Math.random() * 40 + 20);
      } else if (h1) {
        h1.setAttribute('data-text', text + '_');
        h1.classList.add('glitch');
      }
    }

    setTimeout(type, 150);
  };

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
        /* If element is inside engineer-zone, switch to engineer mode first */
        if (el.closest('.engineer-zone') && !document.body.classList.contains('audience-engineer')) {
          applyAudienceMode('engineer');
          showToast(T('toast.engineerActive'));
          /* Wait one frame for display:grid to apply before scrolling */
          requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + elementId);
          });
          return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + elementId);
        return;
      }
      spaNavigate(base + '#' + elementId);
    };

    commands = [
      {
        id: 'nav-home', group: T('cmd.groupNav'), icon: '⌂',
        label: T('cmd.goHome'),
        tags: 'navigation home index inicio',
        run: () => {
          if (normalizePath(window.location.pathname) === normalizePath(new URL(base, window.location.origin).pathname)) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          spaNavigate(base);
        },
      },
      {
        id: 'nav-archive', group: T('cmd.groupNav'), icon: '▤',
        label: T('cmd.goArchive'),
        tags: 'navigation archive posts archivo',
        run: () => spaNavigate(base + 'archive/'),
      },
      {
        id: 'nav-about', group: T('cmd.groupNav'), icon: '◉',
        label: T('cmd.goAbout'),
        tags: 'navigation about cv profile acerca',
        run: () => spaNavigate(base + 'about/'),
      },
      {
        id: 'nav-recruiter', group: T('cmd.groupNav'), icon: '★',
        label: T('cmd.goRecruiter'),
        tags: 'navigation recruiter hiring summary reclutador',
        run: () => scrollOrNav('recruiter-view'),
      },
      {
        id: 'nav-topology', group: T('cmd.groupNav'), icon: '◈',
        label: T('cmd.goTopology'),
        tags: 'navigation network topology latency topologia',
        run: () => scrollOrNav('network-topology'),
      },
      {
        id: 'mode-hardcore', group: T('cmd.groupMode'), icon: '⚡',
        label: T('cmd.hardcoreEnable'),
        tags: 'mode hardcore glitch intense',
        run: () => {
          window.localStorage.setItem('portfolio-mode', 'hardcore');
          document.body.classList.add('hardcore-mode');
          window.dispatchEvent(new CustomEvent('portfolio-request-mode', { detail: { mode: 'hardcore' } }));
          showToast(T('toast.hardcoreEnabled'));
        },
      },
      {
        id: 'mode-normal', group: T('cmd.groupMode'), icon: '○',
        label: T('cmd.normalEnable'),
        tags: 'mode normal calm',
        run: () => {
          window.localStorage.setItem('portfolio-mode', 'normal');
          document.body.classList.remove('hardcore-mode');
          window.dispatchEvent(new CustomEvent('portfolio-request-mode', { detail: { mode: 'normal' } }));
          showToast(T('toast.normalEnabled'));
        },
      },
      {
        id: 'audience-recruiter', group: T('cmd.groupAudience'), icon: '◧',
        label: T('cmd.recruiterSwitch'),
        tags: 'audience recruiter hiring concise reclutador',
        run: () => {
          applyAudienceMode('recruiter');
          showToast(T('toast.recruiterActive'));
        },
      },
      {
        id: 'audience-engineer', group: T('cmd.groupAudience'), icon: '◨',
        label: T('cmd.engineerSwitch'),
        tags: 'audience engineer labs technical ingeniero',
        run: () => {
          applyAudienceMode('engineer');
          showToast(T('toast.engineerActive'));
        },
      },
      {
        id: 'lang-switch', group: T('cmd.groupLang'), icon: '🌐',
        label: T('cmd.switchLang'),
        tags: 'language idioma english español spanish lang',
        run: () => {
          const nextLang = currentLang === 'en' ? 'es' : 'en';
          setLang(nextLang);
          showToast(T('toast.langSwitched'));
        },
      },
      {
        id: 'boot-replay', group: T('cmd.groupSystem'), icon: '↻',
        label: T('cmd.bootReplay'),
        tags: 'boot preloader ssh startup replay arranque',
        run: () => runBootSequence({ force: true }),
      },
      {
        id: 'boot-gate', group: T('cmd.groupSystem'), icon: '⚿',
        label: T('cmd.bootGate'),
        tags: 'boot unlock gate puerta',
        run: () => {
          const key = 'portfolio.boot.gate';
          const on = window.localStorage.getItem(key) === '1';
          window.localStorage.setItem(key, on ? '0' : '1');
          window.dispatchEvent(new CustomEvent('portfolio-boot-gate-change', { detail: { enabled: !on } }));
          showToast(on ? T('toast.bootGateDisabled') : T('toast.bootGateEnabled'));
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
      return c.label.toLowerCase().includes(q) || c.tags.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q);
    });
    if (filtered.length === 0) {
      list.innerHTML = '<div class="command-item-empty">' + T('palette.noMatch') + '</div>';
      return;
    }
    /* Group commands by category */
    const groups = [];
    const groupMap = new Map();
    filtered.forEach((c) => {
      const g = c.group || 'Other';
      if (!groupMap.has(g)) { groupMap.set(g, []); groups.push(g); }
      groupMap.get(g).push(c);
    });
    let html = '';
    let isFirst = true;
    groups.forEach((g) => {
      html += '<div class="command-group-label">' + g + '</div>';
      groupMap.get(g).forEach((c) => {
        const icon = c.icon ? '<span class="command-icon">' + c.icon + '</span>' : '';
        html += '<button type="button" class="command-item' + (isFirst ? ' active' : '') + '" data-cmd-id="' + c.id + '">' + icon + c.label + '</button>';
        isFirst = false;
      });
    });
    list.innerHTML = html;
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

    /* Audience mode: handle requests from any source (once, globally) */
    window.addEventListener('portfolio-request-audience', (event) => {
      const requested = event?.detail?.mode;
      if (requested === 'engineer' || requested === 'recruiter') {
        applyAudienceMode(requested);
      }
    });

    /* Force-reveal engineer zone content when switching to engineer mode */
    window.addEventListener('portfolio-audience-change', (e) => {
      if (e?.detail?.mode === 'engineer') {
        document.querySelectorAll('.engineer-zone .reveal').forEach((el) => {
          el.classList.add('in-view');
        });
      }
    });
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
   *  Language switcher button binding
   * ═══════════════════════════════════════════════════════════════════════ */
  const initLangSwitcher = () => {
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const nextLang = currentLang === 'en' ? 'es' : 'en';
        setLang(nextLang);
        showToast(T('toast.langSwitched'));
        /* Update the button label itself */
        btn.textContent = T('lang.switch');
      });
    });
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
      '.principles-grid .panel', '.engineer-lab', '.network-panel'
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
      /* Skip elements inside .engineer-zone — their visibility is
         controlled entirely by audience-mode display toggling. */
      if (el.closest('.engineer-zone')) {
        el.classList.add('in-view');
        return;
      }
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i * 26, 170) + 'ms';
      observer.observe(el);
    });

    /* Safety net — force-reveal anything still stuck after 3 s */
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => {
        el.classList.add('in-view');
      });
    }, 3000);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Magnetic Buttons & Links
   * ═══════════════════════════════════════════════════════════════════════════ */
  const initMagneticElements = () => {
    if (prefersReducedMotion) return;
    const magneticElements = document.querySelectorAll('.nav-link, .sidebar-search-submit, .command-palette-close');

    magneticElements.forEach((el) => {
      if (el.dataset.magneticBound === '1') return;
      el.dataset.magneticBound = '1';

      const intensity = 0.15;

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = e.clientX - centerX;
        const distY = e.clientY - centerY;

        el.style.transform = `translate(${distX * intensity}px, ${distY * intensity}px)`;
        // Force a fast transition while moving to avoid cursor lag
        el.style.transition = 'transform 0.1s ease-out, background 0.1s ease-out';
      });

      el.addEventListener('mouseleave', () => {
        // Clearing the inline styles hands control back to global.css definitions
        el.style.transform = '';
        el.style.transition = '';
      });
    });
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   *  Page init (runs on every Astro page load)
   * ═══════════════════════════════════════════════════════════════════════ */
  const initPage = () => {
    /* 0. Restore language preference */
    currentLang = getLang();

    /* 1. Apply saved audience mode immediately so CSS visibility
         rules are active before any DOM-dependent work runs. */
    try {
      const saved = window.localStorage.getItem(AUDIENCE_KEY);
      applyAudienceMode(saved === 'engineer' ? 'engineer' : 'recruiter', false);
    } catch {
      applyAudienceMode('recruiter', false);
    }

    /* 2. Immediately guarantee overlays are closed */
    closePalette();
    dismissBoot();

    /* 3. Boot (sessionStorage-guarded, recruiter-skipped) */
    runBootSequence();

    /* 4. Palette */
    buildCommands();
    bindGlobalListeners();   /* no-op after first call */
    bindPalettePage();

    /* 5. Other systems */
    initSidebar();
    initReveal();
    initScrollProgress();
    initAnimatedCounters();
    initUptimeCounter();
    initMagneticElements();

    /* 6. Typewriter (hero WHOAMI animation) */
    initTypewriter();

    /* 7. Audience mode buttons (teaser + AudienceMode tabs) */
    initAudienceButtons();

    /* 8. Language switcher + apply i18n DOM text */
    initLangSwitcher();
    applyI18nDom();

    /* 9. Console Easter egg */
    printConsoleEgg();
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
