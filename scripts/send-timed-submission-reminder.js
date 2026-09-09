import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';
import { getEventConfig } from '../api/_lib/event.js';
import { issueParticipantToken } from '../api/_lib/tokens.js';
import { nineHoursRemainingEmail, threeHoursRemainingEmail } from '../api/_lib/email-templates.js';
import { sendEmail } from '../api/_lib/mailer.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const variants = {
  nine: {
    campaignType: 'submission_9_hours_20260909',
    confirmation: 'SEND-NINE-HOUR-REMINDER',
    purpose: 'nine-hour-reminder',
    idempotencyPrefix: 'nine-hour-reminder-20260909',
    template: nineHoursRemainingEmail,
    scheduledAt: null
  },
  three: {
    campaignType: 'submission_3_hours_20260909',
    confirmation: 'SCHEDULE-THREE-HOUR-REMINDER',
    purpose: 'three-hour-reminder',
    idempotencyPrefix: 'three-hour-reminder-20260909',
    template: threeHoursRemainingEmail,
    scheduledAt: '2026-09-09T15:30:00.000Z'
  }
};

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
const variantName = argument('variant');
const variant = variants[variantName];
if (!variant) throw new Error('Use --variant nine or --variant three.');
const shouldSend = argument('confirm') === variant.confirmation;
const requestedSiteUrl = argument('site') || process.env.ENTANGLE_SITE_URL || '';
if (requestedSiteUrl) process.env.ENTANGLE_SITE_URL = requestedSiteUrl;
const config = getEventConfig();
const supabase = getSupabase();

if (variant.scheduledAt && Date.now() >= new Date(variant.scheduledAt).getTime()) {
  throw new Error('The 9:00 PM IST scheduling time has passed.');
}

const [{ data: participants, error: participantError }, { data: submissions, error: submissionError }, { data: deliveries, error: deliveryError }] = await Promise.all([
  supabase.from('participants').select('id,name,email').is('email_opt_out_at', null).order('registered_at', { ascending: true }),
  supabase.from('submissions').select('participant_id,status'),
  supabase.from('email_deliveries').select('participant_id,status').eq('email_type', variant.campaignType)
]);
if (participantError) throw participantError;
if (submissionError) throw submissionError;
if (deliveryError) throw deliveryError;

const completed = new Set((submissions || []).filter(row => row.status === 'uploaded').map(row => row.participant_id));
const deliveryStatus = new Map((deliveries || []).map(row => [row.participant_id, row.status]));
const eligible = (participants || []).filter(participant => !completed.has(participant.id));
const pending = eligible.filter(participant => !['processing', 'sent'].includes(deliveryStatus.get(participant.id)));

console.log(`Campaign: ${variant.campaignType}`);
console.log(`Registered participants: ${participants.length}`);
console.log(`Completed submissions excluded: ${completed.size}`);
console.log(`Pending recipients: ${pending.length}`);
if (variant.scheduledAt) console.log('Scheduled delivery: 9 September 2026 at 9:00 PM IST');

if (!shouldSend) {
  console.log(`DRY RUN ONLY — no email queued. Use --confirm ${variant.confirmation} after organizer approval.`);
} else {
  let queuedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  for (const participant of pending) {
    const { data: latest, error: latestError } = await supabase.from('submissions')
      .select('status').eq('participant_id', participant.id).maybeSingle();
    if (latestError) throw latestError;
    if (latest?.status === 'uploaded') {
      skippedCount += 1;
      continue;
    }

    const attemptedAt = new Date().toISOString();
    const { data: delivery, error: ledgerError } = await supabase.from('email_deliveries').upsert({
      participant_id: participant.id,
      email_type: variant.campaignType,
      status: 'processing',
      attempted_at: attemptedAt,
      provider_id: null,
      error: null,
      sent_at: null
    }, { onConflict: 'participant_id,email_type' }).select('id').single();
    if (ledgerError) throw ledgerError;

    try {
      const token = await issueParticipantToken(participant.id, variant.purpose);
      const message = variant.template(participant, token);
      if (variant.scheduledAt) message.scheduledAt = variant.scheduledAt;
      const result = await sendEmail(participant.email, message, `${variant.idempotencyPrefix}/${participant.id}`);
      const { error: updateError } = await supabase.from('email_deliveries').update({
        status: 'sent',
        provider_id: result.id,
        sent_at: variant.scheduledAt || new Date().toISOString(),
        error: null
      }).eq('id', delivery.id);
      if (updateError) throw updateError;
      queuedCount += 1;
      console.log(`${variant.scheduledAt ? 'Scheduled' : 'Sent'} ${queuedCount + failedCount}/${pending.length}`);
    } catch (error) {
      failedCount += 1;
      await supabase.from('email_deliveries').update({
        status: 'failed', error: String(error.message || error).slice(0, 1000)
      }).eq('id', delivery.id);
      console.error(`Failed ${queuedCount + failedCount}/${pending.length}: ${error.message}`);
    }
  }
  console.log(`Campaign complete: ${queuedCount} ${variant.scheduledAt ? 'scheduled' : 'sent'}, ${skippedCount} newly completed and skipped, ${failedCount} failed.`);
  if (failedCount) process.exitCode = 1;
}
