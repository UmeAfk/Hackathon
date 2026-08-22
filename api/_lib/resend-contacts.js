const RESEND_API_URL = 'https://api.resend.com';

const segmentNames = {
  registered: 'Entangle 2K26 — Registered',
  submitters: 'Entangle 2K26 — Submitters'
};

const segmentCache = new Map();
let accessUrlPropertyReady = false;

function resendKey() {
  return process.env.RESEND_API_KEY || '';
}

async function resendRequest(path, { method = 'GET', body, allowNotFound = false, allowConflict = false } = {}) {
  const response = await fetch(`${RESEND_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (allowNotFound && response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (allowConflict && response.status === 409) return data;
  if (!response.ok) throw new Error(data.message || data.error?.message || `Resend returned ${response.status}`);
  return data;
}

async function ensureSegment(kind) {
  const name = segmentNames[kind];
  if (!name) throw new Error(`Unknown Resend segment: ${kind}`);
  if (segmentCache.has(kind)) return segmentCache.get(kind);

  const listed = await resendRequest('/segments');
  let segment = listed.data?.find(item => item.name === name);
  if (!segment) segment = await resendRequest('/segments', { method: 'POST', body: { name } });
  segmentCache.set(kind, segment.id);
  return segment.id;
}

async function ensureAccessUrlProperty() {
  if (accessUrlPropertyReady) return;
  const listed = await resendRequest('/contact-properties');
  if (!listed.data?.some(item => item.key === 'access_url')) {
    await resendRequest('/contact-properties', {
      method: 'POST',
      body: { key: 'access_url', type: 'string' }
    });
  }
  accessUrlPropertyReady = true;
}

function nameParts(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts.shift() || '',
    last_name: parts.join(' ')
  };
}

async function addContactToSegment(email, segmentId) {
  return resendRequest(`/contacts/${encodeURIComponent(email)}/segments/${segmentId}`, { method: 'POST', allowConflict: true });
}

export async function syncResendContact(participant, kinds = ['registered'], properties = {}) {
  if (!resendKey()) return { skipped: true };

  const setupTasks = kinds.map(ensureSegment);
  if (properties.access_url) setupTasks.push(ensureAccessUrlProperty());
  const setupResults = await Promise.all(setupTasks);
  const segmentIds = setupResults.slice(0, kinds.length);
  const contactPath = `/contacts/${encodeURIComponent(participant.email)}`;
  const existing = await resendRequest(contactPath, { allowNotFound: true });
  const contactDetails = { ...nameParts(participant.name), ...(Object.keys(properties).length ? { properties } : {}) };
  let contactId = existing?.id || null;

  if (!existing) {
    const created = await resendRequest('/contacts', {
      method: 'POST',
      body: {
        email: participant.email,
        ...contactDetails,
        segments: segmentIds.map(id => ({ id }))
      }
    });
    contactId = created.id;
  } else {
    await resendRequest(contactPath, { method: 'PATCH', body: contactDetails });
    for (const segmentId of segmentIds) await addContactToSegment(participant.email, segmentId);
  }

  return { skipped: false, contactId, segmentIds };
}
