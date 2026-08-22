import { Upload } from '../public/vendor/tus.esm.js';

const TOKEN_KEY = 'av-participant-token';

export function captureParticipantToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const token = new URLSearchParams(hash).get('entry');
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('av-registered', '1');
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
  return token || localStorage.getItem(TOKEN_KEY) || '';
}

export function participantToken() {
  return localStorage.getItem(TOKEN_KEY) || captureParticipantToken();
}

async function apiRequest(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (options.auth !== false) {
    const token = participantToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
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
  if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
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

function runResumableUpload(intent, file, onProgress) {
  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: intent.resumableEndpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        'x-signature': intent.uploadToken,
        'x-upsert': 'false'
      },
      metadata: {
        bucketName: intent.bucketName,
        objectName: intent.storagePath,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600'
      },
      onError(error) {
        reject(new Error(error?.message || 'The resumable upload failed. Check your connection and retry.'));
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (onProgress) onProgress(bytesUploaded, bytesTotal);
      },
      onSuccess() {
        resolve();
      }
    });

    upload.findPreviousUploads()
      .then(previousUploads => {
        if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
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

export async function uploadSubmission({ file, aiUsage, onProgress }) {
  const intent = await apiRequest('/api/submission', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      aiUsage
    })
  });

  await runResumableUpload(intent, file, onProgress);
  await finalizeSubmission(intent.submissionId);
  return intent;
}

captureParticipantToken();
