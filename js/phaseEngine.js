/* =========================================================
   PHASE ENGINE & TIMERS (Flow Spec v4)
   ========================================================= */

import { buildFlipUnit, setFlipValue } from './flipClock.js';
import { showToast } from './utils.js';

export const DAY = 24 * 60 * 60 * 1000;
export const CHALLENGE_WAIT_MS = 6 * DAY;   // 6 days until drop (Countdown A)
export const SUBMIT_WINDOW_MS = 4 * DAY;    // 4 days to submit after drop (Countdown B)
export const TASK_REVEAL_DATE = null;       // Optional fixed admin ISO date string

const urlParams = new URLSearchParams(window.location.search);
const forcedPhaseParam = urlParams.get('phase');

export function getAnchors() {
  let taskRevealTime;
  if (TASK_REVEAL_DATE) {
    taskRevealTime = new Date(TASK_REVEAL_DATE).getTime();
  } else {
    const savedReveal = localStorage.getItem('av-task-reveal-time');
    if (savedReveal) {
      taskRevealTime = parseInt(savedReveal, 10);
    } else {
      taskRevealTime = Date.now() + CHALLENGE_WAIT_MS;
      localStorage.setItem('av-task-reveal-time', taskRevealTime.toString());
    }
  }

  let submissionDeadline = localStorage.getItem('av-submission-deadline');
  if (submissionDeadline) {
    submissionDeadline = parseInt(submissionDeadline, 10);
  } else {
    submissionDeadline = taskRevealTime + SUBMIT_WINDOW_MS;
    localStorage.setItem('av-submission-deadline', submissionDeadline.toString());
  }

  return { taskRevealTime, submissionDeadline };
}

export function computePhase() {
  if (forcedPhaseParam !== null) {
    if (forcedPhaseParam === '0' || forcedPhaseParam === 'upcoming') return 0;
    if (forcedPhaseParam === '1') return 1;
    if (forcedPhaseParam === '2' || forcedPhaseParam === 'live') return 2;
    if (forcedPhaseParam === '3' || forcedPhaseParam === 'closed') return 3;
  }

  const isRegistered = localStorage.getItem('av-registered') === '1';
  if (!isRegistered) {
    return 0;
  }

  const { taskRevealTime, submissionDeadline } = getAnchors();
  const now = Date.now();

  if (now < taskRevealTime) {
    return 1;
  }
  if (now < submissionDeadline) {
    return 2;
  }
  return 3;
}

let activeTimer = null;

export function clearTimers() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

export function startCountdown(targetTime, ids, onComplete) {
  const el = {
    d: document.getElementById(ids.d),
    h: document.getElementById(ids.h),
    m: document.getElementById(ids.m),
    s: document.getElementById(ids.s)
  };
  if (!el.d || !el.h || !el.m || !el.s) return null;

  [el.d, el.h, el.m, el.s].forEach(buildFlipUnit);

  function tick() {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      setFlipValue(el.d, '00');
      setFlipValue(el.h, '00');
      setFlipValue(el.m, '00');
      setFlipValue(el.s, '00');
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
  const timer = setInterval(tick, 1000);
  return timer;
}

export function syncBriefState() {
  const isBriefSubmitted = localStorage.getItem('av-brief-submitted') === '1';
  const btnOpenBriefModal = document.getElementById('btnOpenBriefModal');
  if (btnOpenBriefModal) {
    if (isBriefSubmitted) {
      btnOpenBriefModal.title = 'Brief sent ✓ — click to view';
      btnOpenBriefModal.setAttribute('data-brief-sent', '1');
    } else {
      btnOpenBriefModal.title = 'Share your design brief';
      btnOpenBriefModal.removeAttribute('data-brief-sent');
    }
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

  // Debug pill label
  if (debugPillText) {
    const phaseNames = [
      'Phase 0: Register',
      'Phase 1: Awaiting Drop',
      'Phase 2: Live Drop',
      'Phase 3: Closed'
    ];
    debugPillText.textContent = phaseNames[phase] || `Phase ${phase}`;
  }

  // 1. Hero Section
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

    activeTimer = startCountdown(taskRevealTime, { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' }, () => {
      syncPhase();
    });
  } else if (phase === 2) {
    if (heroCtas) heroCtas.style.display = 'none';
    if (heroClosedCard) heroClosedCard.style.display = 'none';
    if (countdownBlock) countdownBlock.style.display = 'inline-flex';
    if (countdownLabel) countdownLabel.textContent = '[ CHALLENGE IS LIVE — SUBMISSIONS CLOSE IN ]';
    if (countdownEl) countdownEl.style.display = 'flex';

    activeTimer = startCountdown(submissionDeadline, { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' }, () => {
      syncPhase();
    });
  } else if (phase === 3) {
    if (heroCtas) heroCtas.style.display = 'none';
    if (countdownBlock) countdownBlock.style.display = 'none';
    if (heroClosedCard) heroClosedCard.style.display = 'block';
  }

  // 2. Live CTA Row — 3 buttons visible ONLY in Phase 2
  if (phase === 2) {
    if (liveCtaRow) liveCtaRow.style.display = 'flex';
  } else {
    if (liveCtaRow) liveCtaRow.style.display = 'none';
  }

  // 3. Rules Section (Visible ONLY in Phase 2)
  if (phase === 2) {
    if (rulesSection) rulesSection.style.display = 'block';
  } else {
    if (rulesSection) rulesSection.style.display = 'none';
  }

  // 4. Update Brief button state
  syncBriefState();
}

export function cycleDebugPhase() {
  const currentPhase = computePhase();

  if (currentPhase === 0) {
    const now = Date.now();
    localStorage.setItem('av-registered', '1');
    localStorage.setItem('av-registered-name', 'Jordan Vega');
    localStorage.setItem('av-registered-phone', '+1 555 123 4567');
    localStorage.setItem('av-registered-email', 'jordan@studio.com');
    const reveal = now + CHALLENGE_WAIT_MS;
    localStorage.setItem('av-task-reveal-time', reveal.toString());
    localStorage.setItem('av-submission-deadline', (reveal + SUBMIT_WINDOW_MS).toString());
    showToast('Debug: Registered as Jordan Vega → Phase 1 (Countdown A)');
    syncPhase();
  } else if (currentPhase === 1) {
    const now = Date.now();
    localStorage.setItem('av-task-reveal-time', now.toString());
    localStorage.setItem('av-submission-deadline', (now + SUBMIT_WINDOW_MS).toString());
    showToast('Debug: Task Dropped → Phase 2 (Live Challenge)');
    syncPhase();
  } else if (currentPhase === 2) {
    const now = Date.now();
    localStorage.setItem('av-submission-deadline', now.toString());
    showToast('Debug: Window Closed → Phase 3 (Challenge Finished)');
    syncPhase();
  } else if (currentPhase === 3) {
    localStorage.removeItem('av-registered');
    localStorage.removeItem('av-registered-name');
    localStorage.removeItem('av-registered-phone');
    localStorage.removeItem('av-registered-email');
    localStorage.removeItem('av-registered-at');
    localStorage.removeItem('av-design-brief');
    localStorage.removeItem('av-brief-submitted');
    const now = Date.now();
    localStorage.setItem('av-task-reveal-time', (now + CHALLENGE_WAIT_MS).toString());
    localStorage.setItem('av-submission-deadline', (now + CHALLENGE_WAIT_MS + SUBMIT_WINDOW_MS).toString());
    showToast('Debug: Reset → Phase 0 (Register Page)');
    syncPhase();
  }
}

export function initPhaseEngine() {
  syncPhase();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q' || e.code === 'KeyQ') {
      const active = document.activeElement;
      const isEditing = active && (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) ||
        active.isContentEditable
      );

      const isModalOpen = document.querySelector('.modal-backdrop.open');
      if (isEditing || isModalOpen) return;

      cycleDebugPhase();
    }
  }, true);

  const debugPill = document.getElementById('debugPill');
  if (debugPill) {
    debugPill.addEventListener('click', cycleDebugPhase);
  }
}
