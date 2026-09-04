import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';
import { getEventConfig } from '../api/_lib/event.js';
import { issueParticipantToken } from '../api/_lib/tokens.js';
import { briefReminderEmail } from '../api/_lib/email-templates.js';
import { sendEmail } from '../api/_lib/mailer.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaignType = 'brief_reminder_20260904';
const scheduledAt = '2026-09-04T12:30:00.000Z'; // 6:00 PM IST
const requiredConfirmation = 'SCHEDULE-BRIEF-REMINDER';

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
const shouldSchedule = argument('confirm') === requiredConfirmation;
const requestedSiteUrl = argument('site') || process.env.ENTANGLE_SITE_URL || '';
if (requestedSiteUrl) process.env.ENTANGLE_SITE_URL = requestedSiteUrl;
const config = getEventConfig();
const supabase = getSupabase();
const publicSite = new URL(config.siteUrl);
if (publicSite.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(publicSite.hostname)) {
  throw new Error('A public HTTPS event URL is required before scheduling this campaign.');
}

const [{ data: participants, error: participantError }, { data: submissions, error: submissionError }, { data: deliveries, error: deliveryError }] = await Promise.all([
  supabase.from('participants').select('id,name,email').is('email_opt_out_at', null).order('registered_at', { ascending: true }),
  supabase.from('submissions').select('participant_id,design_brief'),
  supabase.from('email_deliveries').select('participant_id,status').eq('email_type', campaignType)
]);
if (participantError) throw participantError;
if (submissionError) throw submissionError;
if (deliveryError) throw deliveryError;

const participantsWithBriefs = new Set((submissions || [])
  .filter(row => String(row.design_brief || '').trim().length > 0)
  .map(row => row.participant_id));
const deliveryStatus = new Map((deliveries || []).map(row => [row.participant_id, row.status]));
const eligible = (participants || []).filter(participant => !participantsWithBriefs.has(participant.id));
const pending = eligible.filter(participant => !['processing', 'sent'].includes(deliveryStatus.get(participant.id)));

console.log(`Registered participants: ${participants.length}`);
console.log(`Briefs already submitted: ${participantsWithBriefs.size}`);
console.log(`Eligible reminder recipients: ${eligible.length}`);
console.log(`Already scheduled: ${eligible.length - pending.length}`);
console.log(`Pending reminders: ${pending.length}`);
console.log('Delivery time: 4 September 2026 at 6:00 PM IST');

if (!shouldSchedule) {
  console.log(`DRY RUN ONLY — no reminder scheduled. Use --confirm ${requiredConfirmation} after organizer approval.`);
} else {
  if (Date.now() >= new Date(scheduledAt).getTime()) {
    throw new Error('The scheduled reminder time has already passed. Do not convert this into an immediate send without organizer approval.');
  }

  let scheduledCount = 0;
  let failedCount = 0;
  for (const participant of pending) {
    const attemptedAt = new Date().toISOString();
    const { data: delivery, error: ledgerError } = await supabase.from('email_deliveries').upsert({
      participant_id: participant.id,
      email_type: campaignType,
      status: 'processing',
      attempted_at: attemptedAt,
      provider_id: null,
      error: null,
      sent_at: null
    }, { onConflict: 'participant_id,email_type' }).select('id').single();
    if (ledgerError) throw ledgerError;

    try {
      const token = await issueParticipantToken(participant.id, 'brief-reminder');
      const result = await sendEmail(participant.email, {
        ...briefReminderEmail(participant, token),
        scheduledAt
      }, `brief-reminder-20260904/${participant.id}`);
      const { error: updateError } = await supabase.from('email_deliveries').update({
        status: 'sent',
        provider_id: result.id,
        sent_at: scheduledAt,
        error: null
      }).eq('id', delivery.id);
      if (updateError) throw updateError;
      scheduledCount += 1;
      console.log(`Scheduled ${scheduledCount + failedCount}/${pending.length}`);
    } catch (error) {
      failedCount += 1;
      await supabase.from('email_deliveries').update({
        status: 'failed',
        error: String(error.message || error).slice(0, 1000)
      }).eq('id', delivery.id);
      console.error(`Failed ${scheduledCount + failedCount}/${pending.length}: ${error.message}`);
    }
  }

  console.log(`Brief reminder campaign ready: ${scheduledCount} scheduled, ${failedCount} failed.`);
  if (failedCount) process.exitCode = 1;
}
