/* =========================================================
   APPLICATION ENTRY POINT — Unified Script & ES-Safe Bootstrap
   ========================================================= */

import { initMarquee } from './marquee.js';
import { initTheme } from './theme.js';
import { initPhaseEngine } from './phaseEngine.js';
import { initModals } from './modals.js';
import { initSubmitModal } from './submitModal.js';
import { initScrollReveal, initAccordion } from './scrollReveal.js';

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
