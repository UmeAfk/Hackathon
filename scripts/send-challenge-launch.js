import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';
import { getEventConfig } from '../api/_lib/event.js';
import { issueParticipantToken } from '../api/_lib/tokens.js';
import { challengeLaunchEmail } from '../api/_lib/email-templates.js';
import { sendEmail } from '../api/_lib/mailer.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaignType = 'challenge_launch';
const attachmentFilename = 'Entangle_2K26_Challenge_Task.pdf';
const requiredConfirmation = 'SEND-CHALLENGE-LAUNCH';

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
  return index >= 0 ? String(process.argv[index + 1] || '') : '';
}

await loadLocalEnvironment();
const shouldSend = argument('confirm') === requiredConfirmation;
const requestedSiteUrl = argument('site') || process.env.ENTANGLE_SITE_URL || '';
if (requestedSiteUrl) process.env.ENTANGLE_SITE_URL = requestedSiteUrl;
const config = getEventConfig();
const supabase = getSupabase();

const siteUrl = new URL(config.siteUrl);
if (siteUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(siteUrl.hostname)) {
  throw new Error('Provide the public HTTPS event URL with --site before preparing or sending this campaign.');
}

const { data: participants, error: participantError } = await supabase
  .from('participants')
  .select('id,name,email')
  .is('email_opt_out_at', null)
  .order('registered_at', { ascending: true });
if (participantError) throw participantError;

const { data: deliveries, error: deliveryError } = await supabase
  .from('email_deliveries')
  .select('participant_id,status')
  .eq('email_type', campaignType);
if (deliveryError) throw deliveryError;

const statusByParticipant = new Map((deliveries || []).map(item => [item.participant_id, item.status]));
const pending = (participants || []).filter(participant => statusByParticipant.get(participant.id) !== 'sent');

const storage = supabase.storage.from('challenge-assets');
const { data: taskFiles, error: listError } = await storage.list('brief', { search: attachmentFilename, limit: 10 });
if (listError) throw listError;
if (!taskFiles?.some(file => file.name === attachmentFilename)) {
  throw new Error(`Missing challenge-assets/brief/${attachmentFilename}`);
}

console.log(`Eligible participants: ${participants.length}`);
console.log(`Already sent: ${participants.length - pending.length}`);
console.log(`Pending recipients: ${pending.length}`);
console.log(`Attachment: challenge-assets/brief/${attachmentFilename}`);
console.log(`Website: ${config.siteUrl}`);

if (!shouldSend) {
  console.log(`DRY RUN ONLY — no email sent. Use --confirm ${requiredConfirmation} after organizer approval.`);
  process.exit(0);
}

if (Date.now() < new Date(config.taskDropsAt).getTime()) {
  throw new Error(`Refusing to send before the task drop at ${config.taskDropsAt}`);
}

const { data: signedAttachment, error: attachmentError } = await storage.createSignedUrl(
  `brief/${attachmentFilename}`,
  60 * 60,
  { download: attachmentFilename }
);
if (attachmentError) throw attachmentError;

let sentCount = 0;
let failedCount = 0;
for (const participant of pending) {
  const attemptedAt = new Date().toISOString();
  const { data: delivery, error: upsertError } = await supabase.from('email_deliveries').upsert({
    participant_id: participant.id,
    email_type: campaignType,
    status: 'processing',
    attempted_at: attemptedAt,
    provider_id: null,
    error: null,
    sent_at: null
  }, { onConflict: 'participant_id,email_type' }).select('id').single();
  if (upsertError) throw upsertError;

  try {
    const token = await issueParticipantToken(participant.id, 'challenge-launch');
    const message = challengeLaunchEmail(participant, token);
    const result = await sendEmail(participant.email, {
      ...message,
      attachments: [{ path: signedAttachment.signedUrl, filename: attachmentFilename }]
    }, `challenge-launch/${participant.id}`);
    const { error: updateError } = await supabase.from('email_deliveries').update({
      status: 'sent',
      provider_id: result.id,
      sent_at: new Date().toISOString(),
      error: null
    }).eq('id', delivery.id);
    if (updateError) throw updateError;
    sentCount += 1;
    console.log(`Sent ${sentCount + failedCount}/${pending.length}`);
  } catch (error) {
    failedCount += 1;
    await supabase.from('email_deliveries').update({
      status: 'failed',
      error: String(error.message || error).slice(0, 1000)
    }).eq('id', delivery.id);
    console.error(`Failed ${sentCount + failedCount}/${pending.length}: ${error.message}`);
  }
}

console.log(`Challenge launch complete: ${sentCount} sent, ${failedCount} failed.`);
if (failedCount) process.exitCode = 1;
