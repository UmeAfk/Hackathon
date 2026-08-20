/* =========================================================
   MODALS SYSTEM — Register, Model, Brief & Help Dialogs
   ========================================================= */

import { showToast } from './utils.js';
import { CHALLENGE_WAIT_MS, SUBMIT_WINDOW_MS, syncPhase, syncBriefState } from './phaseEngine.js';
import { openModal, closeModal, spawnConfetti } from './modalCore.js';

export function initModals() {
  // 1. Register modal
  const registerBackdrop = document.getElementById('registerBackdrop');
  const registerModal = document.getElementById('registerModal');
  const registerFormView = document.getElementById('registerFormView');
  const registerSuccessView = document.getElementById('registerSuccessView');
  const registerForm = document.getElementById('registerForm');
  const regFormError = document.getElementById('regFormError');
  const registerClose = document.getElementById('registerClose');
  const registerDoneBtn = document.getElementById('registerDoneBtn');

  document.querySelectorAll('.js-open-register').forEach(btn => {
    btn.addEventListener('click', () => {
      if (registerFormView) registerFormView.hidden = false;
      if (registerSuccessView) registerSuccessView.hidden = true;
      openModal(registerBackdrop, registerModal);
    });
  });

  if (registerClose) {
    registerClose.addEventListener('click', () => closeModal(registerBackdrop, registerModal, syncPhase));
  }
  if (registerBackdrop) {
    registerBackdrop.addEventListener('click', (e) => {
      if (e.target === registerBackdrop) closeModal(registerBackdrop, registerModal, syncPhase);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!registerForm.checkValidity()) {
        if (regFormError) regFormError.textContent = 'Fill in all three fields to continue.';
        registerForm.reportValidity();
        return;
      }
      if (regFormError) regFormError.textContent = '';

      const name = document.getElementById('regName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const email = document.getElementById('regEmail').value.trim();

      localStorage.setItem('av-registered', '1');
      localStorage.setItem('av-registered-name', name);
      localStorage.setItem('av-registered-phone', phone);
      localStorage.setItem('av-registered-email', email);
      localStorage.setItem('av-registered-at', Date.now().toString());

      const now = Date.now();
      const reveal = now + CHALLENGE_WAIT_MS;
      localStorage.setItem('av-task-reveal-time', reveal.toString());
      localStorage.setItem('av-submission-deadline', (reveal + SUBMIT_WINDOW_MS).toString());

      if (registerFormView) registerFormView.hidden = true;
      if (registerSuccessView) registerSuccessView.hidden = false;
      const successName = document.getElementById('successName');
      if (successName) successName.textContent = name.split(' ')[0] || 'friend';

      if (window.anime) {
        window.anime({ targets: '#successBadge', scale: [0, 1], duration: 500, easing: 'easeOutBack' });
        window.anime({ targets: '#successBadge svg', strokeDashoffset: [40, 0], duration: 500, delay: 150, easing: 'easeOutCubic' });
        spawnConfetti(registerModal);
      }
      registerForm.reset();
    });
  }

  if (registerDoneBtn) {
    registerDoneBtn.addEventListener('click', () => {
      closeModal(registerBackdrop, registerModal, syncPhase);
    });
  }

  // 2. Model Download Modal
  const modelBackdrop = document.getElementById('modelBackdrop');
  const modelModal = document.getElementById('modelModal');
  const modelClose = document.getElementById('modelClose');

  document.querySelectorAll('.js-open-model-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(modelBackdrop, modelModal);
    });
  });
  if (modelClose) {
    modelClose.addEventListener('click', () => closeModal(modelBackdrop, modelModal));
  }
  if (modelBackdrop) {
    modelBackdrop.addEventListener('click', (e) => {
      if (e.target === modelBackdrop) closeModal(modelBackdrop, modelModal);
    });
  }

  document.querySelectorAll('.js-trigger-download').forEach(btn => {
    btn.addEventListener('click', () => {
      const filename = btn.getAttribute('data-filename') || 'ArchViz_Base_Building.fbx';
      showToast(`Downloading ${filename}... Remember to share your Design Brief!`);
      btn.textContent = 'Downloaded ✓';
      setTimeout(() => {
        btn.innerHTML = `Download ${filename.slice(filename.lastIndexOf('.'))}`;
      }, 2500);
    });
  });

  // 3. Design Brief Modal
  const briefModalBackdrop = document.getElementById('briefModalBackdrop');
  const briefModal = document.getElementById('briefModal');
  const briefClose = document.getElementById('briefClose');
  const briefFormView = document.getElementById('briefFormView');
  const briefSuccessView = document.getElementById('briefSuccessView');
  const briefForm = document.getElementById('briefForm');
  const briefText = document.getElementById('briefText');
  const briefWordCount = document.getElementById('briefWordCount');
  const btnSubmitBrief = document.getElementById('btnSubmitBrief');
  const briefFormError = document.getElementById('briefFormError');
  const briefDoneBtn = document.getElementById('briefDoneBtn');

  function updateBriefWordCount() {
    if (!briefText || !briefWordCount) return;
    const text = briefText.value.trim();
    const words = text.length > 0 ? text.split(/\s+/).length : 0;
    briefWordCount.textContent = `${words} / ~100 words`;

    if (btnSubmitBrief) {
      const isAlreadySubmitted = localStorage.getItem('av-brief-submitted') === '1';
      btnSubmitBrief.disabled = text.length < 5;
      if (isAlreadySubmitted) {
        btnSubmitBrief.innerHTML = 'Update Design Brief <svg><use href="#i-arrow"/></svg>';
      } else {
        btnSubmitBrief.innerHTML = 'Send Brief <svg><use href="#i-arrow"/></svg>';
      }
    }
  }

  document.querySelectorAll('.js-open-brief-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const savedBrief = localStorage.getItem('av-design-brief');
      if (savedBrief && briefText) {
        briefText.value = savedBrief;
        updateBriefWordCount();
      }

      if (briefFormView) briefFormView.hidden = false;
      if (briefSuccessView) briefSuccessView.hidden = true;
      openModal(briefModalBackdrop, briefModal);
    });
  });

  if (briefClose) {
    briefClose.addEventListener('click', () => closeModal(briefModalBackdrop, briefModal));
  }
  if (briefModalBackdrop) {
    briefModalBackdrop.addEventListener('click', (e) => {
      if (e.target === briefModalBackdrop) closeModal(briefModalBackdrop, briefModal);
    });
  }

  if (briefText) {
    briefText.addEventListener('input', updateBriefWordCount);
  }

  if (briefForm) {
    briefForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = (briefText ? briefText.value.trim() : '');
      if (text.length < 5) {
        if (briefFormError) briefFormError.textContent = 'Please write a few thoughts on what you plan to build.';
        return;
      }

      localStorage.setItem('av-design-brief', text);
      localStorage.setItem('av-brief-submitted', '1');
      syncBriefState();

      if (briefFormView) briefFormView.hidden = true;
      if (briefSuccessView) briefSuccessView.hidden = false;

      if (window.anime) {
        window.anime({ targets: '#briefSuccessBadge', scale: [0, 1], duration: 500, easing: 'easeOutBack' });
        window.anime({ targets: '#briefSuccessBadge svg', strokeDashoffset: [40, 0], duration: 500, delay: 150, easing: 'easeOutCubic' });
        spawnConfetti(briefModal);
      }
    });
  }

  if (briefDoneBtn) {
    briefDoneBtn.addEventListener('click', () => {
      closeModal(briefModalBackdrop, briefModal);
      showToast('Design Brief saved!');
    });
  }

  // 4. Help modal
  const helpBackdrop = document.getElementById('helpBackdrop');
  const helpModal = helpBackdrop ? helpBackdrop.querySelector('.modal') : null;
  const helpClose = document.getElementById('helpClose');

  document.querySelectorAll('.js-open-help').forEach(btn => {
    btn.addEventListener('click', () => openModal(helpBackdrop, helpModal));
  });
  if (helpClose) {
    helpClose.addEventListener('click', () => closeModal(helpBackdrop, helpModal));
  }
  if (helpBackdrop) {
    helpBackdrop.addEventListener('click', (e) => {
      if (e.target === helpBackdrop) closeModal(helpBackdrop, helpModal);
    });
  }

  // Global Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (registerBackdrop && registerBackdrop.classList.contains('open')) closeModal(registerBackdrop, registerModal, syncPhase);
      if (helpBackdrop && helpBackdrop.classList.contains('open')) closeModal(helpBackdrop, helpModal);
      if (modelBackdrop && modelBackdrop.classList.contains('open')) closeModal(modelBackdrop, modelModal);
      if (briefModalBackdrop && briefModalBackdrop.classList.contains('open')) closeModal(briefModalBackdrop, briefModal);
      const submitModalBackdrop = document.getElementById('submitModalBackdrop');
      const submitModal = document.getElementById('submitModal');
      if (submitModalBackdrop && submitModalBackdrop.classList.contains('open')) closeModal(submitModalBackdrop, submitModal);
    }
  });
}
