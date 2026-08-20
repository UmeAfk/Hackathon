/* =========================================================
   MARQUEE — Smooth ticker with rich variations & hover pause
   ========================================================= */

export function initMarquee() {
  const marqueeTrack = document.getElementById('marqueeTrack');
  if (!marqueeTrack) return;

  const phrases = [
    'UNREAL ENGINE 5',
    'TWINMOTION',
    'ONE BASE MODEL',
    'ONE HERO SHOT',
    'LIGHTING & ATMOSPHERE',
    'ARCHITECTURAL CINEMATICS',
    'REAL-TIME PERFORMANCE',
    'GLOBAL JURY EVALUATION',
    'DEADLINE IS FINAL',
    'SHIP YOUR VISION'
  ];

  function buildMarquee() {
    const oneSetHTML = phrases.map(p => `<span>${p}</span><span class="mq-dot">✦</span>`).join('');
    marqueeTrack.innerHTML = oneSetHTML;
    const targetWidth = window.innerWidth * 2.5;
    let safety = 0;
    while (marqueeTrack.scrollWidth < targetWidth && safety < 40) {
      marqueeTrack.insertAdjacentHTML('beforeend', oneSetHTML);
      safety++;
    }
    marqueeTrack.innerHTML += marqueeTrack.innerHTML;
  }

  buildMarquee();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildMarquee, 300);
  });
}
