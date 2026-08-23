/* =========================================================
   PROJECT SUBMISSION MODAL (2-Step Upload Flow)
   ========================================================= */

import { formatSize, showToast } from './utils.js';
import { openModal, closeModal, spawnConfetti } from './modalCore.js';
import { fetchParticipant, uploadSubmission } from './api.js';

const MAX_SUBMISSION_BYTES = 5 * 1024 * 1024 * 1024;

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
  const uploadProgress = document.getElementById('uploadProgress');
  const uploadProgressTrack = document.getElementById('uploadProgressTrack');
  const uploadProgressFill = document.getElementById('uploadProgressFill');
  const uploadProgressText = document.getElementById('uploadProgressText');

  let uploadedZipFile = null;
  let activeUploadController = null;

  function cancelActiveUpload() {
    if (!activeUploadController) return;
    activeUploadController.abort();
    activeUploadController = null;
  }

  function updateQuickSubmitButtonState() {
    const hasName = submitUploaderName && submitUploaderName.value.trim().length > 0;
    const hasEmail = submitUploaderEmail && submitUploaderEmail.value.trim().length > 0;
    const hasFile = !!uploadedZipFile;
    if (btnQuickSubmit) {
      btnQuickSubmit.disabled = !(hasName && hasEmail && hasFile);
    }
  }

  function handleZipFileSelected(file) {
    if (file.size > MAX_SUBMISSION_BYTES) {
      uploadedZipFile = null;
      if (zipFileInput) zipFileInput.value = '';
      if (zipFileCard) zipFileCard.style.display = 'none';
      if (zipDropzone) zipDropzone.style.display = 'block';
      resetUploadProgress();
      if (quickSubmitError) quickSubmitError.textContent = 'Your archive is larger than the 5 GB submission limit.';
      updateQuickSubmitButtonState();
      return;
    }
    uploadedZipFile = file;
    if (zipFileName) {
      zipFileName.textContent = `${file.name} · ${formatSize(file.size)}`;
    }
    if (zipDropzone) zipDropzone.style.display = 'none';
    if (zipFileCard) zipFileCard.style.display = 'flex';
    if (quickSubmitError) quickSubmitError.textContent = '';
    if (uploadProgress) uploadProgress.hidden = true;
    updateQuickSubmitButtonState();
  }

  function showUploadProgress(bytesUploaded, bytesTotal) {
    const percentage = bytesTotal > 0 ? Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)) : 0;
    if (uploadProgress) uploadProgress.hidden = false;
    if (uploadProgressFill) uploadProgressFill.style.width = `${percentage}%`;
    if (uploadProgressTrack) uploadProgressTrack.setAttribute('aria-valuenow', String(percentage));
    if (uploadProgressText) uploadProgressText.textContent = `${percentage}% · ${formatSize(bytesUploaded)} of ${formatSize(bytesTotal)}`;
    if (btnQuickSubmit) btnQuickSubmit.textContent = `Uploading ${percentage}%`;
  }

  function resetUploadProgress() {
    if (uploadProgress) uploadProgress.hidden = true;
    if (uploadProgressFill) uploadProgressFill.style.width = '0%';
    if (uploadProgressTrack) uploadProgressTrack.setAttribute('aria-valuenow', '0');
    if (uploadProgressText) uploadProgressText.textContent = 'Preparing secure upload…';
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
      resetUploadProgress();

      openModal(submitModalBackdrop, submitModal);
    });
  });

  if (confirmGuidelinesCheck && btnContinueToUpload) {
    confirmGuidelinesCheck.addEventListener('change', () => {
      btnContinueToUpload.disabled = !confirmGuidelinesCheck.checked;
    });
  }

  if (btnContinueToUpload) {
    btnContinueToUpload.addEventListener('click', async () => {
      if (submitModalGuidelinesView) submitModalGuidelinesView.hidden = true;
      if (submitModalFormView) submitModalFormView.hidden = false;

      try {
        const { participant } = await fetchParticipant();
        if (submitUploaderName) submitUploaderName.value = participant.name;
        if (submitUploaderEmail) submitUploaderEmail.value = participant.email;
      } catch (error) {
        if (quickSubmitError) quickSubmitError.textContent = error.message;
      }

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
    submitModalClose.addEventListener('click', () => {
      cancelActiveUpload();
      closeModal(submitModalBackdrop, submitModal);
    });
  }
  if (submitModalBackdrop) {
    submitModalBackdrop.addEventListener('click', (e) => {
      if (e.target === submitModalBackdrop) {
        cancelActiveUpload();
        closeModal(submitModalBackdrop, submitModal);
      }
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
      resetUploadProgress();
      updateQuickSubmitButtonState();
    });
  }

  if (quickSubmitForm) {
    quickSubmitForm.addEventListener('submit', async (e) => {
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
      btnQuickSubmit.textContent = 'Preparing upload…';
      if (btnRemoveZip) btnRemoveZip.disabled = true;
      if (btnBackToGuidelines) btnBackToGuidelines.disabled = true;
      showUploadProgress(0, uploadedZipFile.size);
      const uploadController = new AbortController();
      activeUploadController = uploadController;

      try {
        await uploadSubmission({
          file: uploadedZipFile,
          aiUsage: document.getElementById('submitAiUsage')?.value || 'none',
          onProgress: showUploadProgress,
          signal: uploadController.signal
        });
        btnQuickSubmit.textContent = 'Submit Entry';
        if (submitSuccessAuthor) submitSuccessAuthor.textContent = authorName.split(' ')[0];
        if (submitModalFormView) submitModalFormView.hidden = true;
        if (submitModalSuccessView) submitModalSuccessView.hidden = false;

        if (window.anime) {
          window.anime({ targets: '#submitSuccessBadge', scale: [0, 1], duration: 500, easing: 'easeOutBack' });
          window.anime({ targets: '#submitSuccessBadge svg', strokeDashoffset: [40, 0], duration: 500, delay: 150, easing: 'easeOutCubic' });
          spawnConfetti(submitModal);
        }
      } catch (error) {
        if (quickSubmitError) quickSubmitError.textContent = error.message;
        btnQuickSubmit.textContent = 'Submit Entry';
        updateQuickSubmitButtonState();
      } finally {
        if (activeUploadController === uploadController) activeUploadController = null;
        if (btnRemoveZip) btnRemoveZip.disabled = false;
        if (btnBackToGuidelines) btnBackToGuidelines.disabled = false;
      }
    });
  }

  if (submitModalDoneBtn) {
    submitModalDoneBtn.addEventListener('click', () => {
      closeModal(submitModalBackdrop, submitModal);
      showToast('Project submission logged successfully!');
    });
  }
}
