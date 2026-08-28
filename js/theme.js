/* =========================================================
   THEME TOGGLE — Light / Dark Theme Management
   ========================================================= */

export function initTheme() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeColor = document.getElementById('themeColor');
  const storageKey = 'entangle-theme-v2';
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem(storageKey);
  } catch (_) {
    savedTheme = null;
  }

  const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', initialTheme);

  function updateThemeColor() {
    if (!themeColor) return;
    themeColor.setAttribute('content', root.getAttribute('data-theme') === 'dark' ? '#11100E' : '#F1E6D0');
  }

  function updateToggleLabel() {
    if (!themeToggle) return;
    const dark = root.getAttribute('data-theme') === 'dark';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.setAttribute('aria-pressed', String(dark));
  }

  updateThemeColor();
  updateToggleLabel();
  requestAnimationFrame(() => root.classList.add('theme-ready'));

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem(storageKey, next);
      } catch (_) {
        // The selected theme still applies when browser storage is unavailable.
      }
      updateThemeColor();
      updateToggleLabel();
      if (window.anime) {
        window.anime({
          targets: themeToggle,
          rotate: [0, 360],
          duration: 500,
          easing: 'easeOutCubic'
        });
      }
    });
  }
}
