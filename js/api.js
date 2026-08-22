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

export async function uploadSubmission({ file, aiUsage }) {
  const intent = await apiRequest('/api/submission', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      aiUsage
    })
  });

  const form = new FormData();
  form.append('cacheControl', '3600');
  form.append('', file);
  const uploadResponse = await fetch(intent.signedUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: form
  });
  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'The archive upload failed. Please check your connection and retry.');
  }

  await apiRequest('/api/submission-complete', {
    method: 'POST',
    body: JSON.stringify({ submissionId: intent.submissionId })
  });
  return intent;
}

captureParticipantToken();
