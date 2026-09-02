const PRECISE_POINTER = '(hover: hover) and (pointer: fine)';

function resetCard(card) {
  card.classList.remove('is-pointer-active');
  card.style.setProperty('--tilt-x', '0deg');
  card.style.setProperty('--tilt-y', '0deg');
  card.style.setProperty('--pointer-x', '50%');
  card.style.setProperty('--pointer-y', '50%');
  card.style.setProperty('--image-x', '0px');
  card.style.setProperty('--image-y', '0px');
}

export function initRewardCards() {
  const pointerQuery = window.matchMedia(PRECISE_POINTER);

  document.querySelectorAll('.reward-card-stage').forEach((stage) => {
    const card = stage.querySelector('.reward-card');
    if (!card) return;

    let frame = 0;
    let latestEvent;

    const render = () => {
      frame = 0;
      if (!latestEvent || !pointerQuery.matches) return;

      const bounds = stage.getBoundingClientRect();
      const x = Math.min(Math.max((latestEvent.clientX - bounds.left) / bounds.width, 0), 1);
      const y = Math.min(Math.max((latestEvent.clientY - bounds.top) / bounds.height, 0), 1);
      const normalizedX = (x - 0.5) * 2;
      const normalizedY = (y - 0.5) * 2;

      card.style.setProperty('--tilt-x', `${(-normalizedY * 8).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(normalizedX * 10).toFixed(2)}deg`);
      card.style.setProperty('--pointer-x', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--pointer-y', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--image-x', `${(-normalizedX * 5).toFixed(2)}px`);
      card.style.setProperty('--image-y', `${(-normalizedY * 5).toFixed(2)}px`);
    };

    stage.addEventListener('pointerenter', (event) => {
      if (!pointerQuery.matches) return;
      card.classList.add('is-pointer-active');
      latestEvent = event;
      render();
    });

    stage.addEventListener('pointermove', (event) => {
      if (!pointerQuery.matches) return;
      latestEvent = event;
      if (!frame) frame = window.requestAnimationFrame(render);
    });

    stage.addEventListener('pointerleave', () => {
      latestEvent = undefined;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      resetCard(card);
    });

    pointerQuery.addEventListener('change', () => resetCard(card));
  });
}
