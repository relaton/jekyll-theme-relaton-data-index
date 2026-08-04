// Light/dark appearance switch, mirroring VitePress' behaviour on relaton.org:
// the choice is persisted, and "auto" keeps following the OS preference.
//
// The `.dark` class is applied before first paint by the inline snippet in
// `_includes/head.html`; this file only wires up the toggle.
document.addEventListener('DOMContentLoaded', () => {
  const KEY = 'relaton-appearance';
  const root = document.documentElement;
  const button = document.getElementById('appearance-switch');
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const stored = () => {
    try {
      return localStorage.getItem(KEY) || 'auto';
    } catch (e) {
      return 'auto';
    }
  };

  const store = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      /* private mode — the choice just won't survive a reload */
    }
  };

  const isDark = () => root.classList.contains('dark');

  const sync = () => {
    if (button) button.setAttribute('aria-checked', String(isDark()));
  };

  const apply = (dark) => {
    root.classList.toggle('dark', dark);
    sync();
  };

  // Follow the OS while the user hasn't picked a side.
  media.addEventListener('change', (e) => {
    if (stored() === 'auto') apply(e.matches);
  });

  if (button) {
    button.addEventListener('click', () => {
      const next = !isDark();
      // Fall back to "auto" when the pick matches the OS again.
      store(next === media.matches ? 'auto' : (next ? 'dark' : 'light'));
      apply(next);
    });
  }

  sync();
});
