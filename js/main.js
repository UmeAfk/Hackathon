/* =========================================================
   APPLICATION ENTRY POINT — Unified Script & ES-Safe Bootstrap
   ========================================================= */

import { initMarquee } from './marquee.js?v=20260831a';
import { initTheme } from './theme.js?v=20260831a';
import { initPhaseEngine } from './phaseEngine.js?v=20260831a';
import { initModals } from './modals.js?v=20260831a';
import { initSubmitModal } from './submitModal.js?v=20260831a';
import { initScrollReveal, initAccordion } from './scrollReveal.js?v=20260831a';

function bootstrap() {
  initMarquee();
  initTheme();
  initPhaseEngine();
  initModals();
  initSubmitModal();
  initScrollReveal();
  initAccordion();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
