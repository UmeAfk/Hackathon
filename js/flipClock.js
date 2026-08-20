/* =========================================================
   FLIP CLOCK — Whole-card single flip (no split seam)
   Each digit is one card that rotates -180deg on X axis.
   The "back" face reveals the new number via scaleY(-1).
   ========================================================= */

const ANIM_MS = 380; // total card flip duration

/** Build a 2-digit flip unit inside .flip-clock[data-value="XX"] */
export function buildFlipUnit(el) {
  if (!el || el.dataset.built === '1') return;
  const initial = (el.dataset.value || '00').padStart(2, '0');
  el.innerHTML = '';
  for (let i = 0; i < 2; i++) {
    const ch = initial[i];
    const card = document.createElement('div');
    card.className = 'flip-card';
    card.dataset.value = ch;
    card.innerHTML = `
      <div class="flip-card-inner">
        <div class="flip-face flip-front"><span>${ch}</span></div>
        <div class="flip-face flip-back"><span>${ch}</span></div>
      </div>`;
    el.appendChild(card);
  }
  el.dataset.built = '1';
}

/** Animate a single .flip-card from oldChar → newChar */
export function flipSingleDigit(card, oldChar, newChar) {
  if (card._flipping) return; // guard double-trigger
  card._flipping = true;

  const front = card.querySelector('.flip-front span');
  const back  = card.querySelector('.flip-back  span');
  const inner = card.querySelector('.flip-card-inner');

  // set up: front shows old, back pre-loads new
  front.textContent = oldChar;
  back.textContent  = newChar;

  // start the flip
  inner.classList.remove('flipping');
  void inner.offsetWidth; // force reflow to restart animation
  inner.classList.add('flipping');

  // after animation lands: reset to resting state showing new char
  clearTimeout(card._flipTimer);
  card._flipTimer = setTimeout(() => {
    inner.classList.remove('flipping');
    front.textContent = newChar;
    back.textContent  = newChar;
    card.dataset.value = newChar;
    card._flipping = false;
  }, ANIM_MS + 60);

  card.dataset.value = newChar;
}

/** Public: update a .flip-clock element to display newValue ("00"–"99") */
export function setFlipValue(el, newValue) {
  if (!el) return;
  if (el.dataset.built !== '1') buildFlipUnit(el);

  const current  = (el.dataset.value || '00').padStart(2, '0');
  newValue = String(newValue).padStart(2, '0');
  if (current === newValue) return;
  el.dataset.value = newValue;

  const cards = el.querySelectorAll('.flip-card');
  for (let i = 0; i < 2; i++) {
    if (current[i] !== newValue[i]) {
      flipSingleDigit(cards[i], current[i], newValue[i]);
    }
  }
}
