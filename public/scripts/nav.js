(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getHomeHref = () => document.querySelector('.site-brand')?.getAttribute('href') || '/';
  const ensureTrailingSlash = (path) => (path.endsWith('/') ? path : `${path}/`);

  const initBootSequence = ({ force = false } = {}) => {
    const shell = document.querySelector('[data-boot-sequence]');
    const output = document.querySelector('[data-boot-output]');
    const progressBar = document.querySelector('[data-boot-progress]');
    const progressText = document.querySelector('[data-boot-percent]');
    const gate = document.querySelector('[data-boot-gate]');
    const gateInput = document.querySelector('[data-boot-gate-input]');

    if (!shell || !output || !progressBar || !progressText || !gate || !gateInput) return;

    const storageKey = 'portfolio.boot.sequence.v1';
    const gateKey = 'portfolio.boot.gate';
    const alreadyShown = window.sessionStorage.getItem(storageKey) === '1';
    const gateEnabled = window.localStorage.getItem(gateKey) === '1';
    let lineTimer;
    let failSafeTimer;

    output.innerHTML = '';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    gate.hidden = true;
    gateInput.value = '';
    shell.classList.remove('done');
    shell.classList.remove('gate-error');

    if (gateEnabled) {
      shell.classList.add('gate-enabled');
    } else {
      shell.classList.remove('gate-enabled');
    }

    const finalizeBoot = () => {
      shell.classList.add('done');
      document.body.classList.remove('booting');
      window.sessionStorage.setItem(storageKey, '1');
      window.dispatchEvent(new CustomEvent('portfolio-boot-complete'));
      if (failSafeTimer) {
        window.clearTimeout(failSafeTimer);
      }
    };

    if (!force && (alreadyShown || prefersReducedMotion)) {
      shell.classList.add('done');
      window.sessionStorage.setItem(storageKey, '1');
      window.dispatchEvent(new CustomEvent('portfolio-boot-complete'));
      return;
    }

    document.body.classList.add('booting');

    const bootLines = [
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
      '$ ./serve-llm --healthcheck qwen3.5-edge',
      '[ai] model runtime warmed · deterministic policy active',
      '[ok] engineer cockpit ready',
    ];

    let lineIndex = 0;
    let progress = 0;

    const appendLine = (text) => {
      const line = document.createElement('div');
      line.className = 'boot-line';
      if (text.includes('[ok]')) line.classList.add('boot-ok');
      if (text.includes('[warn]')) line.classList.add('boot-warn');
      if (text.includes('[ssh]') || text.includes('[auth]')) line.classList.add('boot-accent');
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    const tick = () => {
      if (lineIndex >= bootLines.length) {
        progressBar.style.width = '100%';
        if (gateEnabled) {
          gate.hidden = false;
          gateInput.focus();
          return;
        }

        lineTimer = window.setTimeout(finalizeBoot, 320);
        return;
      }

      appendLine(bootLines[lineIndex]);
      lineIndex += 1;
      progress = Math.min(100, progress + Math.round(100 / bootLines.length));
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${progress}%`;
      lineTimer = window.setTimeout(tick, 135 + Math.random() * 110);
    };

    const skipBoot = () => {
      if (lineTimer) window.clearTimeout(lineTimer);
      finalizeBoot();
      document.removeEventListener('keydown', onEsc);
    };

    const onEsc = (event) => {
      if (event.key === 'Escape') skipBoot();
    };

    gateInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const value = gateInput.value.trim().toLowerCase();
      if (value === 'unlock') {
        if (lineTimer) window.clearTimeout(lineTimer);
        finalizeBoot();
        return;
      }

      shell.classList.add('gate-error');
      window.setTimeout(() => shell.classList.remove('gate-error'), 280);
      gateInput.select();
    });

    shell.addEventListener('click', skipBoot, { once: true });
    document.addEventListener('keydown', onEsc);
    failSafeTimer = window.setTimeout(() => {
      finalizeBoot();
    }, 12000);
    tick();
  };

  const initCommandPalette = () => {
    const palette = document.querySelector('[data-command-palette]');
    const closeTarget = document.querySelector('[data-command-palette-close]');
    const input = document.querySelector('[data-command-palette-input]');
    const list = document.querySelector('[data-command-palette-list]');

    if (!palette || !closeTarget || !input || !list) return;

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
        label: 'Replay Boot Sequence',
        tags: 'boot preloader ssh startup replay',
        run: () => {
          window.sessionStorage.removeItem('portfolio.boot.sequence.v1');
          initBootSequence({ force: true });
        },
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
        return command.label.toLowerCase().includes(value) || command.tags.includes(value);
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

    closeTarget.addEventListener('click', () => setPaletteOpen(false));

    document.addEventListener('keydown', (event) => {
      const isHotkey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isHotkey) {
        event.preventDefault();
        setPaletteOpen(palette.hidden);
        return;
      }

      if (event.key === 'Escape' && !palette.hidden) {
        setPaletteOpen(false);
      }
    });

    window.addEventListener('portfolio-open-palette', () => {
      setPaletteOpen(true);
    });
  };

  initBootSequence();
  initCommandPalette();

  const sidebar = document.querySelector('[data-sidebar]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const overlay = document.querySelector('[data-overlay]');

  if (sidebar && toggle && overlay) {
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
  }

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
    element.classList.add('reveal');
    element.style.transitionDelay = `${Math.min(index * 26, 170)}ms`;
    observer.observe(element);
  });
})();
