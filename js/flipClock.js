/* =========================================================
   FLIP CLOCK — Authentic split-flap (Solari board) animation
   Each digit is built from 4 stacked pieces:
     .flip-top     static, always shows the CURRENT top half
     .flip-bottom  static, always shows the CURRENT bottom half
     .flip-front   the moving leaf's top half (old digit),
                    folds down 0° → 90° around the seam   [ease-in]
     .flip-back    the moving leaf's bottom half (new digit),
                    folds down 90° → 0° around the seam   [ease-out]
   Phase 1 (0–HALF_MS):      .flip-front rotates away, exposing
                              the static top (already swapped to new).
   Phase 2 (HALF_MS–2×HALF): .flip-back rotates into place, covering
                              the static bottom (swapped right after).
   This produces the real card-splits-in-half look instead of a
   single card tipping over.
   ========================================================= */

const HALF_MS = 300; // duration of each 90° half-flip (600ms full flip)

const DIGIT_TEMPLATE = (ch) => `<span class="flip-digit-text">${ch}</span>`;

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
      <div class="flip-half flip-top">${DIGIT_TEMPLATE(ch)}</div>
      <div class="flip-half flip-bottom">${DIGIT_TEMPLATE(ch)}</div>
      <div class="flip-leaf flip-front">${DIGIT_TEMPLATE(ch)}</div>
      <div class="flip-leaf flip-back">${DIGIT_TEMPLATE(ch)}</div>
      <div class="flip-seam"></div>`;
    el.appendChild(card);
  }
  el.dataset.built = '1';
}

/**
 * Animate one .flip-card from oldChar → newChar as a true split-flap:
 *
 *   0ms        .flip-front (old, top half) gets .is-flipping
 *              rotateX(0 → 90deg), ease-in — folds away like a falling page
 *   HALF_MS    static .flip-top swaps text to newChar (front leaf is
 *              edge-on / invisible at this instant, so no flash)
 *              .flip-back (new, bottom half) gets .is-flipping
 *              rotateX(-90 → 0deg), ease-out — settles into place
 *   2×HALF_MS  static .flip-bottom swaps text to newChar, leaves reset
 */
function flipSingleDigit(card, oldChar, newChar) {
  if (!card) return;
  if (card._flipping) {
    // A new value arrived mid-flip (e.g. rapid seconds tick) — snap to a
    // clean rest state first so the new flip starts from a known point.
    clearTimeout(card._t2);
    clearTimeout(card._tClean);
    const f = card.querySelector('.flip-front');
    const b = card.querySelector('.flip-back');
    f.classList.remove('is-flipping');
    b.classList.remove('is-flipping');
    card._flipping = false;
  }
  card._flipping = true;

  const top = card.querySelector('.flip-top .flip-digit-text');
  const bottom = card.querySelector('.flip-bottom .flip-digit-text');
  const front = card.querySelector('.flip-front');
  const back = card.querySelector('.flip-back');
  const frontTxt = front.querySelector('.flip-digit-text');
  const backTxt = back.querySelector('.flip-digit-text');

  // Load the leaf faces before animating.
  frontTxt.textContent = oldChar;
  backTxt.textContent = newChar;

  // ── Phase 1: old top folds forward and away ──────────────────────
  front.classList.add('is-flipping');

  const t2 = setTimeout(() => {
    // Front leaf is now edge-on (invisible) — safe to swap underneath.
    top.textContent = newChar;
    // ── Phase 2: new bottom unfolds down into place ─────────────────
    back.classList.add('is-flipping');
  }, HALF_MS);

  const tClean = setTimeout(() => {
    bottom.textContent = newChar;
    // Keep the leaf faces in sync with the static ground truth so that,
    // at rest (rotateX(0) / rotateX(-90)), they render identical content —
    // this matters because the leaves sit above the static halves in
    // paint order, so stale leaf text would otherwise silently occlude
    // the correct static digit after every flip.
    frontTxt.textContent = newChar;
    backTxt.textContent = newChar;
    front.classList.remove('is-flipping');
    back.classList.remove('is-flipping');
    card.dataset.value = newChar;
    card._flipping = false;
  }, HALF_MS * 2);

  clearTimeout(card._t2);
  clearTimeout(card._tClean);
  card._t2 = t2;
  card._tClean = tClean;

  card.dataset.value = newChar;
}

/** Public API: update a .flip-clock element to display newValue ("00"–"99") */
export function setFlipValue(el, newValue) {
  if (!el) return;
  if (el.dataset.built !== '1') buildFlipUnit(el);

  const current = (el.dataset.value || '00').padStart(2, '0');
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
