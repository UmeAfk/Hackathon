/* =========================================================
   PHASE ENGINE — fixed, server-synchronized event timeline
   ========================================================= */

import { buildFlipUnit, setFlipValue } from './flipClock.js?v=20260826g';
import { showToast } from './utils.js?v=20260826g';
import { fetchEventConfig } from './api.js?v=20260904c';

const DAY = 24 * 60 * 60 * 1000;

let timeline = {
  registrationOpensAt: '2026-08-31T11:59:00+05:30',
  registrationClosesAt: '2026-09-04T11:59:00+05:30',
  lateRegistrationClosesAt: '',
  taskDropsAt: '2026-09-04T11:59:00+05:30',
  submissionOpensAt: '2026-09-06T11:59:00+05:30',
  submissionDeadlineAt: '2026-09-09T11:59:00+05:30'
};

const urlParams = new URLSearchParams(window.location.search);
const debugAllowed = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const forcedPhaseParam = debugAllowed ? urlParams.get('phase') : null;
const debugRegistered = debugAllowed && urlParams.get('registered') === '1';
let debugPhase = parseForcedPhase(forcedPhaseParam);
let activeTimer = null;
let registrationCloseTimer = null;

const phaseCopy = [
  {
    lead: 'Design loud.',
    second: 'Render ',
    accent: 'honest.',
    subtitle: '[ One building. One brief. Whatever you make of it ]'
  },
  {
    lead: 'Spot secured.',
    second: 'Stay ',
    accent: 'ready.',
    subtitle: '[ Registration is locked ]'
  },
  {
    lead: 'Model dropped.',
    second: 'Make it ',
    accent: 'unforgettable.',
    subtitle: ''
  },
  {
    lead: 'Time’s up.',
    second: 'Jury’s ',
    accent: 'watching.',
    subtitle: '[ Submissions are sealed ]'
  }
];

const registrationUpcomingCopy = {
  lead: 'Registration opens.',
  second: 'Be there ',
  accent: 'early.',
  subtitle: ''
};

function parseForcedPhase(value) {
  if (value === '0' || value === 'upcoming') return 0;
  if (value === '1') return 1;
  if (value === '2' || value === 'live') return 2;
  if (value === '3' || value === 'closed') return 3;
  return null;
}

function getAnchors() {
  return {
    registrationOpens: new Date(timeline.registrationOpensAt).getTime(),
    taskRevealTime: new Date(timeline.taskDropsAt).getTime(),
    submissionOpens: new Date(timeline.submissionOpensAt).getTime(),
    submissionDeadline: new Date(timeline.submissionDeadlineAt).getTime()
  };
}

function computePhase() {
  if (debugPhase !== null) return debugPhase;
  const now = Date.now();
  const registrationOpens = new Date(timeline.registrationOpensAt).getTime();
  const registrationCloses = new Date(timeline.registrationClosesAt).getTime();
  const { taskRevealTime, submissionDeadline } = getAnchors();
  const isRegistered = localStorage.getItem('av-registered') === '1';
  if (now < registrationOpens) return 0;
  if (now < registrationCloses && !isRegistered) return 0;
  if (now < taskRevealTime) return 1;
  if (now < submissionDeadline) return 2;
  return 3;
}

function registrationIsUpcoming() {
  return debugPhase === null && Date.now() < new Date(timeline.registrationOpensAt).getTime();
}

function registeredOnThisDevice() {
  return debugRegistered || localStorage.getItem('av-registered') === '1';
}

function registrationOpenNow() {
  const now = Date.now();
  const regular = now >= new Date(timeline.registrationOpensAt).getTime()
    && now < new Date(timeline.registrationClosesAt).getTime();
  const lateClose = timeline.lateRegistrationClosesAt
    ? new Date(timeline.lateRegistrationClosesAt).getTime()
    : 0;
  return regular || (lateClose > now && now >= new Date(timeline.taskDropsAt).getTime());
}

function syncRegistrationButton(mode) {
  const button = document.getElementById('heroRegisterBtn');
  const wrapper = document.getElementById('heroRegisterWrap');
  const label = document.getElementById('heroRegisterLabel');
  const icon = document.getElementById('heroRegisterIcon');
  if (!button || !label) return;

  button.classList.toggle('btn-registered', mode === 'registered');
  button.disabled = mode !== 'open';
  button.setAttribute('aria-disabled', String(mode !== 'open'));
  if (mode === 'registered') {
    label.textContent = 'Registered';
    button.title = 'Registration completed on this device.';
    button.setAttribute('aria-label', 'Registered');
    if (icon?.closest('svg')) icon.closest('svg').hidden = true;
    if (wrapper) delete wrapper.dataset.tooltip;
  } else if (mode === 'upcoming') {
    const openingMessage = 'Registration opens on 31 August at 11:59 AM IST.';
    label.textContent = 'Register';
    button.title = openingMessage;
    button.setAttribute('aria-label', openingMessage);
    if (icon?.closest('svg')) icon.closest('svg').hidden = true;
    if (wrapper) wrapper.dataset.tooltip = 'Opens 31 August · 11:59 AM IST';
  } else {
    label.textContent = 'Register';
    button.removeAttribute('title');
    button.setAttribute('aria-label', 'Register for Entangle 2K26');
    if (icon?.closest('svg')) icon.closest('svg').hidden = false;
    if (icon) {
      icon.setAttribute('href', '#i-arrow');
      icon.setAttribute('xlink:href', '#i-arrow');
    }
    if (wrapper) delete wrapper.dataset.tooltip;
  }
}

function clearTimers() {
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
}

function syncSubmissionButton(phase) {
  const button = document.getElementById('cardEarlySubmitBtn');
  const label = document.getElementById('cardEarlySubmitLabel');
  if (!button || !label) return;
  const opensAt = new Date(timeline.submissionOpensAt).getTime();
  const isOpen = phase === 2 && Date.now() >= opensAt;
  button.disabled = !isOpen;
  button.setAttribute('aria-disabled', String(!isOpen));
  if (phase === 2 && !isOpen) {
    label.textContent = 'Submit · Opens 6 Sep';
    button.title = 'Submissions open on 6 September 2026 at 11:59 AM IST.';
    button.setAttribute('aria-label', button.title);
  } else {
    label.textContent = 'Submit';
    button.removeAttribute('title');
    button.setAttribute('aria-label', 'Submit your Entangle 2K26 entry');
  }
  if (registrationCloseTimer) {
    clearTimeout(registrationCloseTimer);
    registrationCloseTimer = null;
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
  const isBriefSubmitted = sessionStorage.getItem('av-brief-submitted') === '1';
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
  const { registrationOpens, taskRevealTime, submissionDeadline } = getAnchors();
  const registrationUpcoming = registrationIsUpcoming();
  const isRegistered = registeredOnThisDevice();
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
  const copy = registrationUpcoming ? registrationUpcomingCopy : (phaseCopy[phase] || phaseCopy[0]);
  if (hero) hero.dataset.phase = String(phase);
  if (heroTitleLead) heroTitleLead.textContent = copy.lead;
  if (heroTitleSecond) heroTitleSecond.textContent = copy.second;
  if (heroTitleAccent) heroTitleAccent.textContent = copy.accent;
  if (heroSubtitle) {
    heroSubtitle.textContent = copy.subtitle;
    heroSubtitle.hidden = !copy.subtitle;
  }
  if (debugPillText) {
    const names = ['Phase 0: Register', 'Phase 1: Awaiting Drop', 'Phase 2: Live Drop', 'Phase 3: Closed'];
    debugPillText.textContent = names[phase] || `Phase ${phase}`;
  }
  if (phase === 0) {
    if (heroCtas) heroCtas.style.display = 'flex';
    if (heroClosedCard) heroClosedCard.style.display = 'none';
    syncRegistrationButton(registrationUpcoming ? 'upcoming' : 'open');
    if (countdownBlock) countdownBlock.style.display = registrationUpcoming ? 'inline-flex' : 'none';
    if (countdownLabel) countdownLabel.textContent = '[ REGISTRATION OPENS IN ]';
    if (countdownEl) countdownEl.style.display = 'flex';
    if (registrationUpcoming) {
      activeTimer = startCountdown(registrationOpens, { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' }, syncPhase);
    }
  } else if (phase === 1) {
    if (heroCtas) heroCtas.style.display = 'flex';
    if (heroClosedCard) heroClosedCard.style.display = 'none';
    syncRegistrationButton(isRegistered ? 'registered' : 'open');
    if (countdownBlock) countdownBlock.style.display = 'inline-flex';
    if (countdownLabel) countdownLabel.textContent = '[ TASK DROPS IN ]';
    if (countdownEl) countdownEl.style.display = 'flex';
    activeTimer = startCountdown(taskRevealTime, { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' }, syncPhase);
  } else if (phase === 2) {
    const lateRegistrationOpen = registrationOpenNow() && !isRegistered;
    if (heroCtas) heroCtas.style.display = lateRegistrationOpen ? 'flex' : 'none';
    if (lateRegistrationOpen) {
      syncRegistrationButton('open');
      const closesIn = new Date(timeline.lateRegistrationClosesAt).getTime() - Date.now();
      if (closesIn > 0) registrationCloseTimer = setTimeout(syncPhase, Math.min(closesIn + 250, 2147483647));
    }
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
  syncSubmissionButton(phase);
  syncBriefState();
}

function cycleDebugPhase() {
  debugPhase = (computePhase() + 1) % 4;
  showToast(`Debug: switched to phase ${debugPhase}`);
  syncPhase();
}

export function initPhaseEngine() {
  const debugPill = document.getElementById('debugPill');
  if (debugPill) debugPill.hidden = !debugAllowed;
  syncPhase();
  fetchEventConfig().then(config => {
    timeline = { ...timeline, ...config };
    syncPhase();
  }).catch(() => showToast('The live schedule could not refresh. Please reload the page. If this continues, contact entangle2k26@vkarch.com.'));
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
