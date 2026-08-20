/* =========================================================
   PROJECT SUBMISSION MODAL (2-Step Upload Flow)
   ========================================================= */

import { formatSize, showToast } from './utils.js';
import { openModal, closeModal, spawnConfetti } from './modalCore.js';

export function initSubmitModal() {
  const submitModalBackdrop = document.getElementById('submitModalBackdrop');
  const submitModal = document.getElementById('submitModal');
  const submitModalClose = document.getElementById('submitModalClose');
  const submitModalGuidelinesView = document.getElementById('submitModalGuidelinesView');
  const submitModalFormView = document.getElementById('submitModalFormView');
  const submitModalSuccessView = document.getElementById('submitModalSuccessView');
  const submitModalDoneBtn = document.getElementById('submitModalDoneBtn');

  const confirmGuidelinesCheck = document.getElementById('confirmGuidelinesCheck');
  const btnContinueToUpload = document.getElementById('btnContinueToUpload');
  const btnBackToGuidelines = document.getElementById('btnBackToGuidelines');

  const quickSubmitForm = document.getElementById('quickSubmitForm');
  const submitUploaderName = document.getElementById('submitUploaderName');
  const submitUploaderEmail = document.getElementById('submitUploaderEmail');
  const zipDropzone = document.getElementById('zipDropzone');
  const zipFileInput = document.getElementById('zipFileInput');
  const zipFileCard = document.getElementById('zipFileCard');
  const zipFileName = document.getElementById('zipFileName');
  const btnRemoveZip = document.getElementById('btnRemoveZip');
  const btnQuickSubmit = document.getElementById('btnQuickSubmit');
  const quickSubmitError = document.getElementById('quickSubmitError');
  const submitSuccessAuthor = document.getElementById('submitSuccessAuthor');

  let uploadedZipFile = null;

  function updateQuickSubmitButtonState() {
    const hasName = submitUploaderName && submitUploaderName.value.trim().length > 0;
    const hasEmail = submitUploaderEmail && submitUploaderEmail.value.trim().length > 0;
    const hasFile = !!uploadedZipFile;
    if (btnQuickSubmit) {
      btnQuickSubmit.disabled = !(hasName && hasEmail && hasFile);
    }
  }

  function handleZipFileSelected(file) {
    uploadedZipFile = file;
    if (zipFileName) {
      zipFileName.textContent = `${file.name} · ${formatSize(file.size)}`;
    }
    if (zipDropzone) zipDropzone.style.display = 'none';
    if (zipFileCard) zipFileCard.style.display = 'flex';
    if (quickSubmitError) quickSubmitError.textContent = '';
    updateQuickSubmitButtonState();
  }

  document.querySelectorAll('.js-open-submit-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (submitModalGuidelinesView) submitModalGuidelinesView.hidden = false;
      if (submitModalFormView) submitModalFormView.hidden = true;
      if (submitModalSuccessView) submitModalSuccessView.hidden = true;

      if (confirmGuidelinesCheck) {
        confirmGuidelinesCheck.checked = false;
      }
      if (btnContinueToUpload) {
        btnContinueToUpload.disabled = true;
      }

      openModal(submitModalBackdrop, submitModal);
    });
  });

  if (confirmGuidelinesCheck && btnContinueToUpload) {
    confirmGuidelinesCheck.addEventListener('change', () => {
      btnContinueToUpload.disabled = !confirmGuidelinesCheck.checked;
    });
  }

  if (btnContinueToUpload) {
    btnContinueToUpload.addEventListener('click', () => {
      if (submitModalGuidelinesView) submitModalGuidelinesView.hidden = true;
      if (submitModalFormView) submitModalFormView.hidden = false;

      const savedName = localStorage.getItem('av-registered-name');
      const savedEmail = localStorage.getItem('av-registered-email');
      if (savedName && submitUploaderName) submitUploaderName.value = savedName;
      if (savedEmail && submitUploaderEmail) submitUploaderEmail.value = savedEmail;

      updateQuickSubmitButtonState();
    });
  }

  if (btnBackToGuidelines) {
    btnBackToGuidelines.addEventListener('click', () => {
      if (submitModalFormView) submitModalFormView.hidden = true;
      if (submitModalGuidelinesView) submitModalGuidelinesView.hidden = false;
    });
  }

  if (submitModalClose) {
    submitModalClose.addEventListener('click', () => closeModal(submitModalBackdrop, submitModal));
  }
  if (submitModalBackdrop) {
    submitModalBackdrop.addEventListener('click', (e) => {
      if (e.target === submitModalBackdrop) closeModal(submitModalBackdrop, submitModal);
    });
  }

  if (submitUploaderName) submitUploaderName.addEventListener('input', updateQuickSubmitButtonState);
  if (submitUploaderEmail) submitUploaderEmail.addEventListener('input', updateQuickSubmitButtonState);

  if (zipDropzone && zipFileInput) {
    zipDropzone.addEventListener('click', () => zipFileInput.click());
    zipDropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        zipFileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(evt => zipDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      zipDropzone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach(evt => zipDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      zipDropzone.classList.remove('drag-over');
    }));
    zipDropzone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (files.length) handleZipFileSelected(files[0]);
    });

    zipFileInput.addEventListener('change', () => {
      if (zipFileInput.files && zipFileInput.files.length) {
        handleZipFileSelected(zipFileInput.files[0]);
      }
    });
  }

  if (btnRemoveZip) {
    btnRemoveZip.addEventListener('click', () => {
      uploadedZipFile = null;
      if (zipFileInput) zipFileInput.value = '';
      if (zipFileCard) zipFileCard.style.display = 'none';
      if (zipDropzone) zipDropzone.style.display = 'block';
      updateQuickSubmitButtonState();
    });
  }

  if (quickSubmitForm) {
    quickSubmitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!uploadedZipFile) {
        if (quickSubmitError) quickSubmitError.textContent = 'Please attach a project archive (.zip) to submit.';
        return;
      }
      if (!quickSubmitForm.checkValidity()) {
        quickSubmitForm.reportValidity();
        return;
      }

      const authorName = (submitUploaderName ? submitUploaderName.value.trim() : '') || 'friend';
      btnQuickSubmit.disabled = true;
      btnQuickSubmit.textContent = 'Uploading project…';

      setTimeout(() => {
        btnQuickSubmit.textContent = 'Submit Entry';
        if (submitSuccessAuthor) submitSuccessAuthor.textContent = authorName.split(' ')[0];
        if (submitModalFormView) submitModalFormView.hidden = true;
        if (submitModalSuccessView) submitModalSuccessView.hidden = false;

        if (window.anime) {
          window.anime({ targets: '#submitSuccessBadge', scale: [0, 1], duration: 500, easing: 'easeOutBack' });
          window.anime({ targets: '#submitSuccessBadge svg', strokeDashoffset: [40, 0], duration: 500, delay: 150, easing: 'easeOutCubic' });
          spawnConfetti(submitModal);
        }
      }, 1000);
    });
  }

  if (submitModalDoneBtn) {
    submitModalDoneBtn.addEventListener('click', () => {
      closeModal(submitModalBackdrop, submitModal);
      showToast('Project submission logged successfully!');
    });
  }
}
