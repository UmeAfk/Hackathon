/* =========================================================
   ARCHIVE STRUCTURE — retro folder-module tween interactions
   ========================================================= */

function reducedMotionRequested() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function tweenFile(module, raised) {
  const motion = module.querySelector('.archive-file-motion');
  if (!motion || !window.anime || reducedMotionRequested()) return;
  const tilt = Number(module.dataset.archiveTilt || 0);
  window.anime.remove(motion);
  window.anime({
    targets: motion,
    translateY: raised ? -11 : 0,
    rotate: raised ? tilt : 0,
    scale: raised ? 1.06 : 1,
    duration: raised ? 360 : 460,
    easing: raised ? 'easeOutBack' : 'easeOutElastic(1, .7)'
  });
}

function bindFolderTweens(structure) {
  structure.querySelectorAll('.archive-module').forEach(module => {
    if (module.dataset.archiveAnimationBound === '1') return;
    module.dataset.archiveAnimationBound = '1';
    module.addEventListener('mouseenter', () => tweenFile(module, true));
    module.addEventListener('mouseleave', () => tweenFile(module, false));
    module.addEventListener('focusin', () => tweenFile(module, true));
    module.addEventListener('focusout', () => tweenFile(module, false));
  });
}

export function animateArchiveStructure() {
  const structure = document.querySelector('[data-archive-structure]');
  if (!structure) return;
  bindFolderTweens(structure);

  const modules = Array.from(structure.querySelectorAll('.archive-module'));
  const motions = Array.from(structure.querySelectorAll('.archive-file-motion'));
  const root = structure.querySelector('.archive-root');
  const zipFlow = structure.querySelector('.archive-zip-flow');
  const targets = [root, ...modules, ...motions, zipFlow].filter(Boolean);

  targets.forEach(target => target.removeAttribute('style'));
  if (!window.anime || reducedMotionRequested()) return;
  window.anime.remove(targets);

  window.anime.timeline({
    complete: () => targets.forEach(target => target.removeAttribute('style'))
  })
    .add({
      targets: root,
      opacity: [0, 1],
      translateX: [-18, 0],
      duration: 360,
      easing: 'easeOutCubic'
    })
    .add({
      targets: modules,
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.94, 1],
      delay: window.anime.stagger(105),
      duration: 520,
      easing: 'easeOutBack'
    }, '-=170')
    .add({
      targets: motions,
      translateY: [17, 0],
      rotate: (element, index) => [index % 2 === 0 ? -8 : 8, 0],
      delay: window.anime.stagger(85),
      duration: 520,
      easing: 'easeOutElastic(1, .65)'
    }, '-=390')
    .add({
      targets: zipFlow,
      opacity: [0, 1],
      translateX: [-14, 0],
      duration: 320,
      easing: 'easeOutCubic'
    }, '-=220');
}
