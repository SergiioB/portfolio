(function () {
  const sidebar = document.querySelector('[data-sidebar]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const overlay = document.querySelector('[data-overlay]');

  if (!sidebar || !toggle || !overlay) return;

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
})();
