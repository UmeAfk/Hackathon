/* =========================================================
   APPLICATION ENTRY POINT — Unified Script & ES-Safe Bootstrap
   ========================================================= */

import { initMarquee } from './marquee.js?v=20260831a';
import { initTheme } from './theme.js?v=20260831a';
import { initPhaseEngine } from './phaseEngine.js?v=20260904c';
import { initModals } from './modals.js?v=20260904d';
import { initSubmitModal } from './submitModal.js?v=20260904d';
import { initScrollReveal, initAccordion } from './scrollReveal.js?v=20260831a';
import { initRewardCards } from './rewardCards.js?v=20260902b';

function bootstrap() {
  initMarquee();
  initTheme();
  initPhaseEngine();
  initModals();
  initSubmitModal();
  initScrollReveal();
  initAccordion();
  initRewardCards();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
