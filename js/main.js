/* =========================================================
   APPLICATION ENTRY POINT — Unified Script & ES-Safe Bootstrap
   ========================================================= */

import { initMarquee } from './marquee.js?v=20260826g';
import { initTheme } from './theme.js?v=20260826g';
import { initPhaseEngine } from './phaseEngine.js?v=20260826g';
import { initModals } from './modals.js?v=20260826g';
import { initSubmitModal } from './submitModal.js?v=20260826g';
import { initScrollReveal, initAccordion } from './scrollReveal.js?v=20260826g';

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
