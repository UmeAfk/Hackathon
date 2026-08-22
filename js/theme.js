/* =========================================================
   THEME TOGGLE — Light / Dark Theme Management
   ========================================================= */

export function initTheme() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('av-theme');

  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }

  function updateToggleLabel() {
    if (!themeToggle) return;
    const dark = root.getAttribute('data-theme') === 'dark';
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeToggle.setAttribute('aria-pressed', String(dark));
  }

  updateToggleLabel();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('av-theme', next);
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
