/* =========================================================
   MODALS SYSTEM — Register, Model, Brief & Help Dialogs
   ========================================================= */

import { showToast } from './utils.js?v=20260826g';
import { syncPhase, syncBriefState } from './phaseEngine.js?v=20260826g';
import { openModal, closeModal, spawnConfetti } from './modalCore.js?v=20260826g';
import { fetchParticipant, getAssetDownload, registerParticipant, saveDesignBrief } from './api.js?v=20260904c';

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
  const regAge = document.getElementById('regAge');
  const regTerms = document.getElementById('regTerms');
  const regPhone = document.getElementById('regPhone');
  const regEmail = document.getElementById('regEmail');
  const btnSubmitRegister = document.getElementById('btnSubmitRegister');

  function indianPhoneDigits(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, 10);
  }

  function validRegistrationEmail(value) {
    const email = String(value || '').trim();
    if (!email || email.length > 254 || /\s/.test(email)) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
    if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
    const labels = domain.split('.');
    return labels.length >= 2
      && labels.every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))
      && /^[A-Za-z]{2,63}$/.test(labels.at(-1));
  }

  function updateRegisterButtonState() {
    if (btnSubmitRegister) {
      const nameReady = String(registerForm?.elements.regName?.value || '').trim().length >= 2;
      const phoneReady = /^[6-9]\d{9}$/.test(indianPhoneDigits(regPhone?.value));
      const emailReady = validRegistrationEmail(regEmail?.value);
      btnSubmitRegister.disabled = !(nameReady && phoneReady && emailReady && regAge?.checked && regTerms?.checked);
    }
  }

  if (regAge) regAge.addEventListener('change', updateRegisterButtonState);
  if (regTerms) regTerms.addEventListener('change', updateRegisterButtonState);
  if (registerForm?.elements.regName) registerForm.elements.regName.addEventListener('input', updateRegisterButtonState);
  if (regPhone) {
    regPhone.addEventListener('input', () => {
      regPhone.value = indianPhoneDigits(regPhone.value);
      const valid = !regPhone.value || /^[6-9]\d{9}$/.test(regPhone.value);
      regPhone.setCustomValidity(valid ? '' : 'Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      if (regFormError) regFormError.textContent = '';
      updateRegisterButtonState();
    });
  }
  if (regEmail) {
    regEmail.addEventListener('input', () => {
      regEmail.setCustomValidity(!regEmail.value || validRegistrationEmail(regEmail.value)
        ? ''
        : 'Enter a valid email address, for example name@example.com.');
      if (regFormError) regFormError.textContent = '';
      updateRegisterButtonState();
    });
  }

  document.querySelectorAll('.js-open-register').forEach(btn => {
    btn.addEventListener('click', () => {
      if (registerFormView) registerFormView.hidden = false;
      if (registerSuccessView) registerSuccessView.hidden = true;
      updateRegisterButtonState();
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
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ageCheck = document.getElementById('regAge');
      const termsCheck = document.getElementById('regTerms');

      if (!registerForm.checkValidity() || (ageCheck && !ageCheck.checked) || (termsCheck && !termsCheck.checked)) {
        if (regFormError) regFormError.textContent = 'Please fill all fields and check both required confirmations.';
        registerForm.reportValidity();
        return;
      }
      if (regFormError) regFormError.textContent = '';

      const name = document.getElementById('regName').value.trim();
      const phone = `+91${indianPhoneDigits(document.getElementById('regPhone').value)}`;
      const email = document.getElementById('regEmail').value.trim();

      btnSubmitRegister.disabled = true;
      btnSubmitRegister.textContent = 'Registering…';
      try {
        const result = await registerParticipant({
          name,
          phone,
          email,
          ageConfirmed: true,
          termsAccepted: true,
          website: registerForm.elements.website?.value || ''
        });

        localStorage.setItem('av-registered', '1');
        localStorage.setItem('av-registered-at', Date.now().toString());

        if (registerFormView) registerFormView.hidden = true;
        if (registerSuccessView) registerSuccessView.hidden = false;
        const successName = document.getElementById('successName');
        if (successName) successName.textContent = name.split(' ')[0] || 'friend';
        const successCopy = registerSuccessView?.querySelector('.modal-sub');
        if (successCopy && result.message) successCopy.textContent = result.message;

        if (window.anime) {
          window.anime({ targets: '#successBadge', scale: [0, 1], duration: 500, easing: 'easeOutBack' });
          window.anime({ targets: '#successBadge svg', strokeDashoffset: [40, 0], duration: 500, delay: 150, easing: 'easeOutCubic' });
          spawnConfetti(registerModal);
        }
        registerForm.reset();
        syncPhase();
      } catch (error) {
        if (regFormError) regFormError.textContent = error.message;
        const duplicateField = error.field === 'phone' ? regPhone : (error.field === 'email' ? regEmail : null);
        if (duplicateField) {
          duplicateField.setCustomValidity(error.message);
          duplicateField.focus();
          duplicateField.reportValidity();
        }
      } finally {
        btnSubmitRegister.textContent = 'Register';
        updateRegisterButtonState();
      }
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
    btn.addEventListener('click', async () => {
      const asset = btn.getAttribute('data-asset') || '';
      const originalLabel = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Preparing…';
      try {
        const result = await getAssetDownload(asset);
        const downloads = Array.isArray(result.files) && result.files.length
          ? result.files
          : [{ url: result.url, filename: result.filename }];
        const preparedFiles = await Promise.all(downloads.map(async download => {
          const fileResponse = await fetch(download.url, {
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
          });
          if (!fileResponse.ok) throw new Error('The secure download could not be completed. Please try again.');
          return {
            filename: download.filename,
            localUrl: URL.createObjectURL(await fileResponse.blob())
          };
        }));

        preparedFiles.forEach(file => {
          const link = document.createElement('a');
          link.href = file.localUrl;
          link.download = file.filename;
          link.rel = 'noopener';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(file.localUrl), 60_000);
        });

        btn.textContent = 'Downloaded';
        showToast(preparedFiles.length > 1
          ? `${preparedFiles.length} companion files are downloading. Keep them together in the same folder.`
          : `${preparedFiles[0].filename} is downloading.`);
        setTimeout(() => {
          closeModal(modelBackdrop, modelModal);
          openBriefEditor();
        }, 700);
      } catch (error) {
        showToast(error.message);
        btn.innerHTML = originalLabel;
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalLabel;
        }, 2500);
      }
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
  const briefIdentity = document.getElementById('briefIdentity');
  const briefParticipantName = document.getElementById('briefParticipantName');
  const briefParticipantContact = document.getElementById('briefParticipantContact');

  async function loadBriefParticipant() {
    if (briefParticipantName) briefParticipantName.textContent = 'Checking your secure link…';
    if (briefParticipantContact) briefParticipantContact.textContent = 'Your brief will be saved with your registration.';
    if (briefIdentity) briefIdentity.removeAttribute('data-error');
    try {
      const { participant, designBrief } = await fetchParticipant();
      if (briefParticipantName) briefParticipantName.textContent = participant.name;
      if (briefParticipantContact) briefParticipantContact.textContent = `${participant.email} · ${participant.phone}`;
      if (designBrief && briefText && !briefText.value.trim()) briefText.value = designBrief;
      if (designBrief) sessionStorage.setItem('av-brief-submitted', '1');
      else sessionStorage.removeItem('av-brief-submitted');
      updateBriefWordCount();
      syncBriefState();
    } catch (error) {
      if (briefIdentity) briefIdentity.setAttribute('data-error', 'true');
      if (briefParticipantName) briefParticipantName.textContent = 'Secure participant link required';
      if (briefParticipantContact) briefParticipantContact.textContent = error.message;
    }
  }

  function updateBriefWordCount() {
    if (!briefText || !briefWordCount) return;
    const text = briefText.value.trim();
    const words = text.length > 0 ? text.split(/\s+/).length : 0;
    briefWordCount.textContent = `${words} / ~100 words`;

    if (btnSubmitBrief) {
      const isAlreadySubmitted = sessionStorage.getItem('av-brief-submitted') === '1';
      btnSubmitBrief.disabled = text.length < 5;
      if (isAlreadySubmitted) {
        btnSubmitBrief.innerHTML = 'Update Design Brief <svg class="action-arrow"><use href="#i-arrow"/></svg>';
      } else {
        btnSubmitBrief.innerHTML = 'Send Brief <svg class="action-arrow"><use href="#i-arrow"/></svg>';
      }
    }
  }

  function openBriefEditor() {
    if (briefFormView) briefFormView.hidden = false;
    if (briefSuccessView) briefSuccessView.hidden = true;
    updateBriefWordCount();
    openModal(briefModalBackdrop, briefModal);
    loadBriefParticipant();
  }

  document.querySelectorAll('.js-open-brief-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBriefEditor();
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
    briefForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (briefText ? briefText.value.trim() : '');
      if (text.length < 5) {
        if (briefFormError) briefFormError.textContent = 'Please write a few thoughts on what you plan to build.';
        return;
      }

      btnSubmitBrief.disabled = true;
      const previousLabel = btnSubmitBrief.innerHTML;
      btnSubmitBrief.textContent = 'Saving…';
      try {
        await saveDesignBrief(text);
        sessionStorage.setItem('av-brief-submitted', '1');
        syncBriefState();

        if (briefFormView) briefFormView.hidden = true;
        if (briefSuccessView) briefSuccessView.hidden = false;

        if (window.anime) {
          window.anime({ targets: '#briefSuccessBadge', scale: [0, 1], duration: 500, easing: 'easeOutBack' });
          window.anime({ targets: '#briefSuccessBadge svg', strokeDashoffset: [40, 0], duration: 500, delay: 150, easing: 'easeOutCubic' });
          spawnConfetti(briefModal);
        }
      } catch (error) {
        if (briefFormError) briefFormError.textContent = error.message;
        btnSubmitBrief.innerHTML = previousLabel;
        updateBriefWordCount();
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
