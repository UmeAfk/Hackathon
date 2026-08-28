/* Apply the saved theme before CSS paints, without requiring an inline script. */
(() => {
  try {
    const savedTheme = localStorage.getItem('entangle-theme-v3');
    const selectedTheme = savedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = selectedTheme;
    document.documentElement.style.colorScheme = selectedTheme;
    const colorScheme = document.getElementById('themeColorScheme');
    const themeColor = document.getElementById('themeColor');
    if (colorScheme) colorScheme.content = selectedTheme;
    if (themeColor) themeColor.content = selectedTheme === 'dark' ? '#11100E' : '#F1E6D0';
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
  }
})();
