/* =========================================================
   UTILITIES — Shared helper functions
   ========================================================= */

let toastTimer = null;

export function showToast(msg) {
  const statusToast = document.getElementById('statusToast');
  if (!statusToast) return;
  statusToast.textContent = msg;
  statusToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    statusToast.classList.remove('show');
  }, 2800);
}

export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
