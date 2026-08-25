import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { twoDayReminderBroadcast } from '../api/_lib/email-templates.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const segmentName = 'Entangle 2K26 — Registered';

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadLocalEnvironment() {
  const source = await readFile(path.join(projectRoot, '.env.local'), 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = unquote(match[2]);
  }
}

async function resend(pathname, options = {}) {
  const response = await fetch(`https://api.resend.com${pathname}`, {
    ...options,
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error?.message || `Resend returned ${response.status}`);
  return data;
}

await loadLocalEnvironment();
if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');

const segments = await resend('/segments');
const segment = segments.data?.find(item => item.name === segmentName);
if (!segment) throw new Error(`The “${segmentName}” segment does not exist yet. Complete one controlled registration first.`);

const reminder = twoDayReminderBroadcast();
const broadcasts = await resend('/broadcasts');
const existing = broadcasts.data?.find(item => item.name === reminder.name && ['draft', 'scheduled'].includes(item.status));

if (existing) {
  console.log(`Existing ${existing.status} reminder: https://resend.com/broadcasts/${existing.id}`);
} else {
  const created = await resend('/broadcasts', {
    method: 'POST',
    body: JSON.stringify({
      segment_id: segment.id,
      from: process.env.RESEND_FROM_EMAIL,
      reply_to: process.env.RESEND_REPLY_TO,
      name: reminder.name,
      subject: reminder.subject,
      html: reminder.html,
      text: reminder.text
    })
  });
  console.log(`Draft created: https://resend.com/broadcasts/${created.id}`);
  console.log('Review and test-send the draft in Resend. This script never sends or schedules it.');
}
