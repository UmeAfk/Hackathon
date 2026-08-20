/* =========================================================
   UTILITIES — Shared helper functions
   ========================================================= */

let toastTimer = null;

export function showToast(msg) {
  const debugToast = document.getElementById('debugToast');
  if (!debugToast) return;
  debugToast.textContent = msg;
  debugToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    debugToast.classList.remove('show');
  }, 2800);
}

export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
