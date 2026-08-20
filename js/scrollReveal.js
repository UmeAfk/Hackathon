/* =========================================================
   SCROLL REVEAL & ACCORDION
   ========================================================= */

export function initScrollReveal() {
  const revealTargets = document.querySelectorAll('.rule-card, .drop-card, .acc-item, .help-card');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (window.anime) {
          window.anime({
            targets: entry.target,
            translateY: [18, 0],
            opacity: [0, 1],
            duration: 600,
            easing: 'easeOutCubic'
          });
        }
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach(el => io.observe(el));
}

export function initAccordion() {
  document.querySelectorAll('.acc-item').forEach(item => {
    const trigger = item.querySelector('.acc-trigger');
    const panel = item.querySelector('.acc-panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          const otherTrigger = other.querySelector('.acc-trigger');
          const otherPanel = other.querySelector('.acc-panel');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          if (otherPanel) otherPanel.style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.style.maxHeight = null;
      } else {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
}
