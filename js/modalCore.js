/* =========================================================
   MODAL CORE UTILITIES — Open, Close, Confetti Animation
   ========================================================= */

export function openModal(backdrop, modal) {
  if (!backdrop || !modal) return;
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (window.anime) {
    window.anime({
      targets: modal,
      scale: [0.9, 1],
      translateY: [16, 0],
      opacity: [0, 1],
      duration: 420,
      easing: 'easeOutBack'
    });
  } else {
    modal.style.opacity = 1;
    modal.style.transform = 'none';
  }
}

export function closeModal(backdrop, modal, onClosed) {
  if (!backdrop || !modal) return;
  if (window.anime) {
    window.anime({
      targets: modal,
      scale: [1, 0.94],
      translateY: [0, 10],
      opacity: [1, 0],
      duration: 220,
      easing: 'easeInCubic',
      complete: () => {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
        if (onClosed) onClosed();
      }
    });
  } else {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (onClosed) onClosed();
  }
}

export function spawnConfetti(container) {
  if (!container || !window.anime) return;
  const colors = ['#E6552E', '#EFB13D', '#6E7C3F', '#A63E19'];
  const frag = document.createDocumentFragment();
  const dots = [];
  for (let i = 0; i < 18; i++) {
    const dot = document.createElement('span');
    dot.className = 'confetti-dot';
    dot.style.background = colors[i % colors.length];
    frag.appendChild(dot);
    dots.push(dot);
  }
  container.appendChild(frag);
  dots.forEach(dot => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 90;
    window.anime({
      targets: dot,
      translateX: Math.cos(angle) * dist,
      translateY: Math.sin(angle) * dist - 20,
      rotate: Math.random() * 360,
      opacity: [1, 0],
      duration: 900 + Math.random() * 400,
      easing: 'easeOutCubic',
      complete: () => dot.remove()
    });
  });
}
