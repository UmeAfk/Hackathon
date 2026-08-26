/* =========================================================
   PHASE ENGINE — fixed, server-synchronized event timeline
   ========================================================= */

import { buildFlipUnit, setFlipValue } from './flipClock.js';
import { showToast } from './utils.js';
import { fetchEventConfig } from './api.js';

const DAY = 24 * 60 * 60 * 1000;

let timeline = {
  registrationOpensAt: '2026-08-31T11:59:00+05:30',
  registrationClosesAt: '2026-09-04T11:59:00+05:30',
  taskDropsAt: '2026-09-04T11:59:00+05:30',
  submissionDeadlineAt: '2026-09-09T11:59:00+05:30'
};

const urlParams = new URLSearchParams(window.location.search);
const debugAllowed = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const forcedPhaseParam = debugAllowed ? urlParams.get('phase') : null;
let debugPhase = parseForcedPhase(forcedPhaseParam);
let activeTimer = null;

const phaseCopy = [
  {
    lead: 'Design loud.',
    second: 'Render ',
    accent: 'honest.',
    subtitle: 'One building. One brief. Whatever you make of it.'
  },
  {
    lead: 'Spot secured.',
    second: 'Stay ',
    accent: 'ready.',
    subtitle: 'Registration is locked. The model lands for everyone at the same moment.'
  },
  {
    lead: 'Model dropped.',
    second: 'Make it ',
    accent: 'unforgettable.',
    subtitle: 'Four days. One base model. Your strongest architectural story.'
  },
  {
    lead: 'Time’s up.',
    second: 'Jury’s ',
    accent: 'watching.',
    subtitle: 'Submissions are sealed. Every eligible entry now gets a careful look.'
  }
];

function parseForcedPhase(value) {
  if (value === '0' || value === 'upcoming') return 0;
  if (value === '1') return 1;
  if (value === '2' || value === 'live') return 2;
  if (value === '3' || value === 'closed') return 3;
  return null;
}

function getAnchors() {
  return {
    taskRevealTime: new Date(timeline.taskDropsAt).getTime(),
    submissionDeadline: new Date(timeline.submissionDeadlineAt).getTime()
  };
}

function computePhase() {
  if (debugPhase !== null) return debugPhase;
  const now = Date.now();
  const registrationCloses = new Date(timeline.registrationClosesAt).getTime();
  const { taskRevealTime, submissionDeadline } = getAnchors();
  const isRegistered = localStorage.getItem('av-registered') === '1';
  if (now < registrationCloses && !isRegistered) return 0;
  if (now < taskRevealTime) return 1;
  if (now < submissionDeadline) return 2;
  return 3;
}

function clearTimers() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

function startCountdown(targetTime, ids, onComplete) {
  const el = {
    d: document.getElementById(ids.d), h: document.getElementById(ids.h),
    m: document.getElementById(ids.m), s: document.getElementById(ids.s)
  };
  if (!el.d || !el.h || !el.m || !el.s) return null;
  [el.d, el.h, el.m, el.s].forEach(buildFlipUnit);
  let timer;
  function tick() {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      setFlipValue(el.d, '00'); setFlipValue(el.h, '00');
      setFlipValue(el.m, '00'); setFlipValue(el.s, '00');
      if (timer) clearInterval(timer);
      if (onComplete) onComplete();
      return;
    }
    const d = Math.floor(diff / DAY);
    const h = Math.floor((diff % DAY) / (60 * 60 * 1000));
    const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const s = Math.floor((diff % (60 * 1000)) / 1000);
    setFlipValue(el.d, String(d).padStart(2, '0'));
    setFlipValue(el.h, String(h).padStart(2, '0'));
    setFlipValue(el.m, String(m).padStart(2, '0'));
    setFlipValue(el.s, String(s).padStart(2, '0'));
  }
  tick();
  timer = setInterval(tick, 1000);
  return timer;
}

export function syncBriefState() {
  const isBriefSubmitted = localStorage.getItem('av-brief-submitted') === '1';
  const button = document.getElementById('btnOpenBriefModal');
  if (!button) return;
  if (isBriefSubmitted) {
    button.title = 'Brief sent ✓ — click to view';
    button.setAttribute('data-brief-sent', '1');
  } else {
    button.title = 'Share your design brief';
    button.removeAttribute('data-brief-sent');
  }
}

export function syncPhase() {
  clearTimers();
  const phase = computePhase();
  const { taskRevealTime, submissionDeadline } = getAnchors();
  const heroCtas = document.getElementById('heroCtas');
  const heroClosedCard = document.getElementById('heroClosedCard');
  const countdownBlock = document.getElementById('countdownBlock');
  const countdownLabel = document.getElementById('countdownLabel');
  const countdownEl = document.getElementById('countdown');
  const liveCtaRow = document.getElementById('liveCtaRow');
  const rulesSection = document.getElementById('rules');
  const debugPillText = document.getElementById('debugPillText');
  const hero = document.querySelector('.hero');
  const heroTitleLead = document.getElementById('heroTitleLead');
  const heroTitleSecond = document.getElementById('heroTitleSecond');
  const heroTitleAccent = document.getElementById('heroTitleAccent');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const copy = phaseCopy[phase] || phaseCopy[0];
  if (hero) hero.dataset.phase = String(phase);
  if (heroTitleLead) heroTitleLead.textContent = copy.lead;
  if (heroTitleSecond) heroTitleSecond.textContent = copy.second;
  if (heroTitleAccent) heroTitleAccent.textContent = copy.accent;
  if (heroSubtitle) heroSubtitle.textContent = copy.subtitle;
  if (debugPillText) {
    const names = ['Phase 0: Register', 'Phase 1: Awaiting Drop', 'Phase 2: Live Drop', 'Phase 3: Closed'];
    debugPillText.textContent = names[phase] || `Phase ${phase}`;
  }
  if (phase === 0) {
    if (heroCtas) heroCtas.style.display = 'flex';
    if (heroClosedCard) heroClosedCard.style.display = 'none';
    if (countdownBlock) countdownBlock.style.display = 'none';
  } else if (phase === 1) {
    if (heroCtas) heroCtas.style.display = 'none';
    if (heroClosedCard) heroClosedCard.style.display = 'none';
    if (countdownBlock) countdownBlock.style.display = 'inline-flex';
    if (countdownLabel) countdownLabel.textContent = '[ TASK DROPS IN ]';
    if (countdownEl) countdownEl.style.display = 'flex';
    activeTimer = startCountdown(taskRevealTime, { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' }, syncPhase);
  } else if (phase === 2) {
    if (heroCtas) heroCtas.style.display = 'none';
    if (heroClosedCard) heroClosedCard.style.display = 'none';
    if (countdownBlock) countdownBlock.style.display = 'inline-flex';
    if (countdownLabel) countdownLabel.textContent = '[ CHALLENGE IS LIVE — SUBMISSIONS CLOSE IN ]';
    if (countdownEl) countdownEl.style.display = 'flex';
    activeTimer = startCountdown(submissionDeadline, { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' }, syncPhase);
  } else {
    if (heroCtas) heroCtas.style.display = 'none';
    if (countdownBlock) countdownBlock.style.display = 'none';
    if (heroClosedCard) heroClosedCard.style.display = 'block';
  }
  if (liveCtaRow) liveCtaRow.style.display = phase === 2 ? '' : 'none';
  if (rulesSection) rulesSection.style.display = phase === 2 ? 'block' : 'none';
  syncBriefState();
}

function cycleDebugPhase() {
  debugPhase = (computePhase() + 1) % 4;
  showToast(`Debug: switched to phase ${debugPhase}`);
  syncPhase();
}

export function initPhaseEngine() {
  const debugPill = document.getElementById('debugPill');
  if (debugPill) debugPill.style.display = debugAllowed ? 'flex' : 'none';
  syncPhase();
  fetchEventConfig().then(config => {
    timeline = { ...timeline, ...config };
    syncPhase();
  }).catch(() => showToast('Using the published event schedule. Live schedule sync is temporarily unavailable.'));
  if (!debugAllowed) return;
  window.addEventListener('keydown', event => {
    if (event.key !== 'q' && event.key !== 'Q' && event.code !== 'KeyQ') return;
    const active = document.activeElement;
    const isEditing = active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable);
    if (isEditing || document.querySelector('.modal-backdrop.open')) return;
    cycleDebugPhase();
  }, true);
  if (debugPill) debugPill.addEventListener('click', cycleDebugPhase);
}
