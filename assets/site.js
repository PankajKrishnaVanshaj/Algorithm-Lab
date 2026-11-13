'use strict';

(() => {
  const toggle = document.querySelector('[data-action="toggle-theme"]');
  const icon = document.querySelector('.theme-icon');
  let theme = 'light';

  try {
    const saved = localStorage.getItem('pankri-algorithm-lab-theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (_) { /* The page remains usable if storage is unavailable. */ }

  function applyTheme(nextTheme) {
    theme = nextTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    if (toggle) {
      toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  applyTheme(theme);
  if (toggle) {
    toggle.addEventListener('click', () => {
      applyTheme(theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem('pankri-algorithm-lab-theme', theme); } catch (_) { /* Theme still works for this session. */ }
    });
  }
})();
