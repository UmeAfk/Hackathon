import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendEmail } from '../api/_lib/mailer.js';
import { getSupabase } from '../api/_lib/supabase.js';
import { emailPreviewMessages } from './_lib/email-preview-messages.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) return trimmed.slice(1, -1);
  return trimmed;
}

async function loadLocalEnvironment() {
  const source = await readFile(path.join(projectRoot, '.env.local'), 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = unquote(match[2]);
  }
}

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

await loadLocalEnvironment();
const recipient = argument('to').trim();
const requestedTemplate = argument('template').trim() || 'all';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  throw new Error('Provide a test mailbox with --to name@example.com');
}

const available = emailPreviewMessages();
const selected = requestedTemplate === 'all'
  ? available
  : available.filter(preview => preview.slug === requestedTemplate);
if (!selected.length) {
  throw new Error(`Unknown template “${requestedTemplate}”. Choose: all, ${available.map(item => item.slug).join(', ')}`);
}

async function challengeBriefAttachment() {
  const filename = 'Entangle_2K26_Challenge_Task.pdf';
  const { data, error } = await getSupabase().storage
    .from('challenge-assets')
    .createSignedUrl(`brief/${filename}`, 10 * 60, { download: filename });
  if (error) throw error;
  return { path: data.signedUrl, filename };
}

for (const preview of selected) {
  const attachments = preview.slug === 'challenge-launch'
    ? [await challengeBriefAttachment()]
    : undefined;
  const idempotencyKey = `preview/${preview.slug}/${recipient}/${Date.now()}`;
  const sent = await sendEmail(recipient, {
    ...preview.message,
    subject: `[TEST] ${preview.message.subject}`,
    ...(attachments ? { attachments } : {})
  }, idempotencyKey);
  console.log(`Sent ${preview.slug}: ${sent.id || 'accepted'}`);
}
