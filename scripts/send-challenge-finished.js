import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';
import { challengeFinishedEmail } from '../api/_lib/email-templates.js';
import { sendEmail } from '../api/_lib/mailer.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaignType = 'challenge_finished_jury_review_20260910';
const requiredConfirmation = 'SEND-CHALLENGE-FINISHED';

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
const supabase = getSupabase();

const [{ data: participants, error: participantError }, { data: deliveries, error: deliveryError }] = await Promise.all([
  supabase.from('participants').select('id,name,email').is('email_opt_out_at', null).order('registered_at', { ascending: true }),
  supabase.from('email_deliveries').select('participant_id,status').eq('email_type', campaignType)
]);
if (participantError) throw participantError;
if (deliveryError) throw deliveryError;

const deliveryStatus = new Map((deliveries || []).map(row => [row.participant_id, row.status]));
const pending = (participants || []).filter(participant => !['processing', 'sent'].includes(deliveryStatus.get(participant.id)));

console.log(`Registered participants: ${participants.length}`);
console.log(`Pending closing updates: ${pending.length}`);

if (!shouldSend) {
  console.log(`DRY RUN ONLY — no email sent. Use --confirm ${requiredConfirmation} after organizer approval.`);
} else {
  let sentCount = 0;
  let failedCount = 0;
  for (const participant of pending) {
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
      const result = await sendEmail(participant.email, challengeFinishedEmail(participant), `challenge-finished-20260910/${participant.id}`);
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
  console.log(`Closing update complete: ${sentCount} sent, ${failedCount} failed.`);
  if (failedCount) process.exitCode = 1;
}
