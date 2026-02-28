(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getHomeHref = () => document.querySelector('.site-brand')?.getAttribute('href') || '/';
  const ensureTrailingSlash = (path) => (path.endsWith('/') ? path : `${path}/`);

  const bootRuntime = {
    runId: 0,
    lineTimer: 0,
    failSafeTimer: 0,
    finishTimer: 0,
    escHandler: null,
  };

  const paletteRuntime = {
    bound: false,
    setOpen: null,
    toggleHandler: null,
  };

  const clearBootTimers = () => {
    if (bootRuntime.lineTimer) window.clearTimeout(bootRuntime.lineTimer);
    if (bootRuntime.failSafeTimer) window.clearTimeout(bootRuntime.failSafeTimer);
    if (bootRuntime.finishTimer) window.clearTimeout(bootRuntime.finishTimer);
    bootRuntime.lineTimer = 0;
    bootRuntime.failSafeTimer = 0;
    bootRuntime.finishTimer = 0;
  };

  const detachEscHandler = () => {
    if (bootRuntime.escHandler) {
      document.removeEventListener('keydown', bootRuntime.escHandler);
      bootRuntime.escHandler = null;
    }
  };

  const runBootSequence = ({ force = false } = {}) => {
    const shell = document.querySelector('[data-boot-sequence]');
    const output = document.querySelector('[data-boot-output]');
    const progressBar = document.querySelector('[data-boot-progress]');
    const progressText = document.querySelector('[data-boot-percent]');
    const gate = document.querySelector('[data-boot-gate]');
    const gateInput = document.querySelector('[data-boot-gate-input]');

    if (!shell || !output || !progressBar || !progressText || !gate || !gateInput) return;

    bootRuntime.runId += 1;
    const currentRun = bootRuntime.runId;
    clearBootTimers();
    detachEscHandler();

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

    const setProgress = (value) => {
      const normalized = Math.max(0, Math.min(100, value));
      progressBar.style.width = `${normalized}%`;
      progressText.textContent = `${Math.round(normalized)}%`;
    };

    const finalizeBoot = () => {
      if (currentRun !== bootRuntime.runId) return;
      clearBootTimers();
      detachEscHandler();
      shell.classList.add('done');
      document.body.classList.remove('booting');
      window.dispatchEvent(new CustomEvent('portfolio-boot-complete'));
    };

    const skipBoot = () => {
      setProgress(100);
      finalizeBoot();
    };

    shell.onclick = () => skipBoot();
    bootRuntime.escHandler = (event) => {
      if (event.key === 'Escape') {
        skipBoot();
      }
    };
    document.addEventListener('keydown', bootRuntime.escHandler);

    gateInput.onkeydown = (event) => {
      if (event.key !== 'Enter') return;
      const value = gateInput.value.trim().toLowerCase();
      if (value === 'unlock') {
        skipBoot();
        return;
      }

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
      bootRuntime.finishTimer = window.setTimeout(finalizeBoot, 120);
      return;
    }

    let lineIndex = 0;

    const tick = () => {
      if (currentRun !== bootRuntime.runId) return;

      if (lineIndex >= bootLines.length) {
        setProgress(100);
        if (gateEnabled) {
          gate.hidden = false;
          gateInput.focus();
          return;
        }

        bootRuntime.finishTimer = window.setTimeout(finalizeBoot, 260);
        return;
      }

      appendLine(bootLines[lineIndex]);
      lineIndex += 1;
      setProgress((lineIndex / bootLines.length) * 100);
      bootRuntime.lineTimer = window.setTimeout(tick, 95 + Math.random() * 85);
    };

    bootRuntime.failSafeTimer = window.setTimeout(() => {
      if (currentRun !== bootRuntime.runId) return;
      setProgress(100);
      finalizeBoot();
    }, 9000);

    tick();
  };

  const initCommandPalette = () => {
    const palette = document.querySelector('[data-command-palette]');
    const closeTargets = Array.from(document.querySelectorAll('[data-command-palette-close]'));
    const input = document.querySelector('[data-command-palette-input]');
    const list = document.querySelector('[data-command-palette-list]');

    if (!palette || closeTargets.length === 0 || !input || !list) return;

    const base = ensureTrailingSlash(getHomeHref());
    const navigate = (target) => {
      window.location.href = target;
    };

    const setPaletteOpen = (open) => {
      palette.hidden = !open;
      document.body.classList.toggle('palette-open', open);
      if (open) {
        input.value = '';
        renderCommands('');
        input.focus();
      }
    };

    paletteRuntime.setOpen = setPaletteOpen;

    closeTargets.forEach((target) => {
      if (target.dataset.bound === '1') return;
      target.dataset.bound = '1';
      target.addEventListener('click', () => setPaletteOpen(false));
    });

    if (palette.dataset.bound !== '1') {
      palette.dataset.bound = '1';
      palette.addEventListener('mousedown', (event) => {
        if (event.target === palette) {
          setPaletteOpen(false);
        }
      });
    }

    if (!paletteRuntime.bound) {
      paletteRuntime.bound = true;

      paletteRuntime.toggleHandler = (event) => {
        const livePalette = document.querySelector('[data-command-palette]');
        if (!livePalette || !paletteRuntime.setOpen) return;

        const isHotkey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
        if (isHotkey) {
          event.preventDefault();
          paletteRuntime.setOpen(livePalette.hidden);
          return;
        }

        if (event.key === 'Escape' && !livePalette.hidden) {
          event.preventDefault();
          paletteRuntime.setOpen(false);
        }
      };

      document.addEventListener('keydown', paletteRuntime.toggleHandler);

      window.addEventListener('portfolio-open-palette', () => {
        if (paletteRuntime.setOpen) {
          paletteRuntime.setOpen(true);
        }
      });
    }

    const commands = [
      {
        label: 'Go to Home',
        tags: 'navigation home index',
        run: () => navigate(base),
      },
      {
        label: 'Go to Archive',
        tags: 'navigation archive posts',
        run: () => navigate(`${base}archive/`),
      },
      {
        label: 'Go to About',
        tags: 'navigation about cv profile',
        run: () => navigate(`${base}about/`),
      },
      {
        label: 'Go to Network Topology',
        tags: 'navigation network topology latency map',
        run: () => {
          if (window.location.pathname.startsWith(`${base}`) && document.getElementById('network-topology')) {
            document.getElementById('network-topology')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
          navigate(`${base}#network-topology`);
        },
      },
      {
        label: 'Enable Hardcore Mode',
        tags: 'mode hardcore glitch intense',
        run: () => {
          window.localStorage.setItem('portfolio-mode', 'hardcore');
          document.body.classList.add('hardcore-mode');
          window.dispatchEvent(new CustomEvent('portfolio-request-mode', { detail: { mode: 'hardcore' } }));
        },
      },
      {
        label: 'Enable Normal Mode',
        tags: 'mode normal calm',
        run: () => {
          window.localStorage.setItem('portfolio-mode', 'normal');
          document.body.classList.remove('hardcore-mode');
          window.dispatchEvent(new CustomEvent('portfolio-request-mode', { detail: { mode: 'normal' } }));
        },
      },
      {
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
        label: 'Replay Boot Sequence',
        tags: 'boot preloader ssh startup replay',
        run: () => runBootSequence({ force: true }),
      },
      {
        label: 'Toggle Boot Unlock Gate',
        tags: 'boot unlock gate type unlock security',
        run: () => {
          const key = 'portfolio.boot.gate';
          const enabled = window.localStorage.getItem(key) === '1';
          window.localStorage.setItem(key, enabled ? '0' : '1');
          window.dispatchEvent(new CustomEvent('portfolio-boot-gate-change', { detail: { enabled: !enabled } }));
        },
      },
    ];

    const renderCommands = (query) => {
      const value = query.trim().toLowerCase();
      const filtered = commands.filter((command) => {
        if (!value) return true;
        return command.label.toLowerCase().includes(value) || command.tags.toLowerCase().includes(value);
      });

      if (filtered.length === 0) {
        list.innerHTML = '<div class="command-item-empty">No command matched.</div>';
        return;
      }

      list.innerHTML = filtered
        .map(
          (command, index) =>
            `<button type="button" class="command-item${index === 0 ? ' active' : ''}" data-command-index="${commands.indexOf(command)}">${command.label}</button>`
        )
        .join('');
    };

    const runActiveCommand = () => {
      const active = list.querySelector('.command-item.active');
      if (!active) return;
      const index = Number(active.getAttribute('data-command-index'));
      if (Number.isNaN(index) || !commands[index]) return;
      commands[index].run();
      setPaletteOpen(false);
    };

    const moveActive = (direction) => {
      const items = Array.from(list.querySelectorAll('.command-item'));
      if (items.length === 0) return;
      const activeIndex = items.findIndex((item) => item.classList.contains('active'));
      const nextIndex = activeIndex < 0 ? 0 : (activeIndex + direction + items.length) % items.length;
      items.forEach((item) => item.classList.remove('active'));
      items[nextIndex].classList.add('active');
      items[nextIndex].scrollIntoView({ block: 'nearest' });
    };

    list.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('command-item')) return;
      const index = Number(target.getAttribute('data-command-index'));
      if (Number.isNaN(index) || !commands[index]) return;
      commands[index].run();
      setPaletteOpen(false);
    });

    input.addEventListener('input', () => {
      renderCommands(input.value);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveActive(1);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(-1);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        runActiveCommand();
      }
    });

    renderCommands('');
    setPaletteOpen(false);

    document.addEventListener(
      'astro:before-swap',
      () => {
        setPaletteOpen(false);
      },
      { once: true }
    );
  };

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

    toggle.addEventListener('click', () => {
      setOpen(!sidebar.classList.contains('open'));
    });

    overlay.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    sidebar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 960px)').matches) {
          setOpen(false);
        }
      });
    });
  };

  const initReveal = () => {
    const revealTargets = [
      '.hero',
      '.section-block',
      '.timeline-item',
      '.skill-card',
      '.principles-grid .panel',
      '.engineer-lab',
      '.network-panel',
    ];

    const elements = document.querySelectorAll(revealTargets.join(','));
    if (elements.length === 0) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('in-view'));
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
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    elements.forEach((element, index) => {
      if (element.classList.contains('reveal')) return;
      element.classList.add('reveal');
      element.style.transitionDelay = `${Math.min(index * 26, 170)}ms`;
      observer.observe(element);
    });
  };

  const initPage = () => {
    runBootSequence();
    initCommandPalette();
    initSidebar();
    initReveal();

    document.querySelectorAll('[data-set-audience]').forEach((button) => {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-set-audience');
        if (!mode) return;
        window.dispatchEvent(new CustomEvent('portfolio-request-audience', { detail: { mode } }));
      });
    });
  };

  let initialized = false;
  document.addEventListener('astro:page-load', () => {
    initialized = true;
    initPage();
  });

  window.addEventListener(
    'load',
    () => {
      if (!initialized) {
        initPage();
      }
    },
    { once: true }
  );
})();
