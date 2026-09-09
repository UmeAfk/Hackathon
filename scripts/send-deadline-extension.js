import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';
import { getEventConfig } from '../api/_lib/event.js';
import { issueParticipantToken } from '../api/_lib/tokens.js';
import { deadlineExtendedEmail } from '../api/_lib/email-templates.js';
import { sendEmail } from '../api/_lib/mailer.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaignType = 'submission_deadline_extended_20260909_2359';
const requiredConfirmation = 'SEND-DEADLINE-EXTENSION';

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

const [{ data: participants, error: participantError }, { data: submissions, error: submissionError }, { data: deliveries, error: deliveryError }] = await Promise.all([
  supabase.from('participants').select('id,name,email').is('email_opt_out_at', null).order('registered_at', { ascending: true }),
  supabase.from('submissions').select('participant_id,status'),
  supabase.from('email_deliveries').select('participant_id,status').eq('email_type', campaignType)
]);
if (participantError) throw participantError;
if (submissionError) throw submissionError;
if (deliveryError) throw deliveryError;

const completed = new Set((submissions || []).filter(row => row.status === 'uploaded').map(row => row.participant_id));
const deliveryStatus = new Map((deliveries || []).map(row => [row.participant_id, row.status]));
const eligible = (participants || []).filter(participant => !completed.has(participant.id));
const pending = eligible.filter(participant => !['processing', 'sent'].includes(deliveryStatus.get(participant.id)));

console.log(`Updated deadline: ${config.submissionDeadlineAt}`);
console.log(`Registered participants: ${participants.length}`);
console.log(`Completed submissions excluded: ${completed.size}`);
console.log(`Pending extension recipients: ${pending.length}`);

if (!shouldSend) {
  console.log(`DRY RUN ONLY — no email sent. Use --confirm ${requiredConfirmation} after organizer approval.`);
} else {
  let sentCount = 0;
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

    const { data: delivery, error: ledgerError } = await supabase.from('email_deliveries').upsert({
      participant_id: participant.id,
      email_type: campaignType,
      status: 'processing',
      attempted_at: new Date().toISOString(),
      provider_id: null,
      error: null,
      sent_at: null
    }, { onConflict: 'participant_id,email_type' }).select('id').single();
    if (ledgerError) throw ledgerError;

    try {
      const token = await issueParticipantToken(participant.id, 'deadline-extension');
      const result = await sendEmail(participant.email, deadlineExtendedEmail(participant, token), `deadline-extension-20260909/${participant.id}`);
      const { error: updateError } = await supabase.from('email_deliveries').update({
        status: 'sent', provider_id: result.id, sent_at: new Date().toISOString(), error: null
      }).eq('id', delivery.id);
      if (updateError) throw updateError;
      sentCount += 1;
      console.log(`Sent ${sentCount + failedCount}/${pending.length}`);
    } catch (error) {
      failedCount += 1;
      await supabase.from('email_deliveries').update({
        status: 'failed', error: String(error.message || error).slice(0, 1000)
      }).eq('id', delivery.id);
      console.error(`Failed ${sentCount + failedCount}/${pending.length}: ${error.message}`);
    }
  }
  console.log(`Deadline-extension email complete: ${sentCount} sent, ${skippedCount} newly completed and skipped, ${failedCount} failed.`);
  if (failedCount) process.exitCode = 1;
}
