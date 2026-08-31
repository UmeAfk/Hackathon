import { Upload } from '../public/vendor/tus.esm.js';

const TOKEN_KEY = 'av-participant-token';
const SUPPORT_MESSAGE = 'Please try again. If the problem continues, contact entangle2k26@vkarch.com.';

function captureParticipantToken() {
  ['av-registered-name', 'av-registered-email', 'av-registered-phone'].forEach(key => localStorage.removeItem(key));
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const token = new URLSearchParams(hash).get('entry');
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('av-registered', '1');
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
  return token || sessionStorage.getItem(TOKEN_KEY) || '';
}

function participantToken() {
  return sessionStorage.getItem(TOKEN_KEY) || captureParticipantToken();
}

async function apiRequest(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (options.auth !== false) {
    const token = participantToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error(`We could not connect right now. ${SUPPORT_MESSAGE}`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Something went wrong. ${SUPPORT_MESSAGE}`);
    error.status = response.status;
    error.code = data.code || '';
    error.field = data.field || '';
    throw error;
  }
  return data;
}

export async function fetchEventConfig() {
  return apiRequest('/api/event-config', { method: 'GET', auth: false });
}

export async function fetchParticipant() {
  return apiRequest('/api/participant', { method: 'GET' });
}

export async function registerParticipant(details) {
  const data = await apiRequest('/api/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(details)
  });
  if (data.token) sessionStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function saveDesignBrief(brief) {
  return apiRequest('/api/brief', { method: 'POST', body: JSON.stringify({ brief }) });
}

export async function getAssetDownload(filename) {
  return apiRequest('/api/asset-download', {
    method: 'POST',
    body: JSON.stringify({ filename })
  });
}

function cancelledUploadError() {
  const error = new Error('Upload cancelled.');
  error.name = 'AbortError';
  return error;
}

function runResumableUpload(intent, file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let abortHandler;
    const cleanup = () => {
      if (signal && abortHandler) signal.removeEventListener('abort', abortHandler);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const upload = new Upload(file, {
      endpoint: intent.resumableEndpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        apikey: intent.apiKey,
        'x-signature': intent.uploadToken
      },
      metadata: {
        bucketName: intent.bucketName,
        objectName: intent.storagePath,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600'
      },
      onError() {
        finish(reject, new Error(`The upload was interrupted. Check your connection and retry. If it still fails, contact entangle2k26@vkarch.com.`));
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress) onProgress(bytesUploaded, bytesTotal);
      },
      onSuccess() {
        finish(resolve);
      }
    });

    abortHandler = () => {
      upload.abort(true)
        .catch(() => {})
        .finally(() => finish(reject, cancelledUploadError()));
    };
    if (signal?.aborted) {
      abortHandler();
      return;
    }
    if (signal) signal.addEventListener('abort', abortHandler, { once: true });

    upload.findPreviousUploads()
      .then(previousUploads => {
        if (signal?.aborted) return;
        if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(() => finish(reject, new Error(`The upload could not resume. ${SUPPORT_MESSAGE}`)));
  });
}

async function finalizeSubmission(submissionId) {
  let latestError;
  for (const delay of [0, 1000, 2500]) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    try {
      return await apiRequest('/api/submission-complete', {
        method: 'POST',
        body: JSON.stringify({ submissionId })
      });
    } catch (error) {
      latestError = error;
    }
  }
  throw latestError;
}

export async function uploadSubmission({ file, aiUsage, onProgress, signal }) {
  const intent = await apiRequest('/api/submission', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      aiUsage
    })
  });

  await runResumableUpload(intent, file, onProgress, signal);
  await finalizeSubmission(intent.submissionId);
  return intent;
}

captureParticipantToken();
