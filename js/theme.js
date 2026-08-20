/* =========================================================
   THEME TOGGLE — Light / Dark Theme Management
   ========================================================= */

export function initTheme() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('av-theme');

  if (savedTheme) {
    root.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('av-theme', next);
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
