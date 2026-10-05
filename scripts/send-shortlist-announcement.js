import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';
import { shortlistAnnouncementEmail } from '../api/_lib/email-templates.js';
import { sendEmail } from '../api/_lib/mailer.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaignType = 'shortlist_announcement_20260921';
const requiredConfirmation = 'SEND-SHORTLIST-ANNOUNCEMENT';

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

function isConfirmed() {
  const index = process.argv.indexOf('--confirm');
  return index >= 0 && process.argv[index + 1] === requiredConfirmation;
}

await loadLocalEnvironment();
const supabase = getSupabase();
const [{ data: submissions, error: submissionError }, { data: deliveries, error: deliveryError }] = await Promise.all([
  supabase.from('submissions').select('participant_id,status').eq('status', 'uploaded'),
  supabase.from('email_deliveries').select('participant_id,status').eq('email_type', campaignType)
]);
if (submissionError) throw submissionError;
if (deliveryError) throw deliveryError;

const submittedIds = [...new Set((submissions || []).map(row => row.participant_id).filter(Boolean))];
const { data: participants, error: participantError } = await supabase
  .from('participants')
  .select('id,name,email')
  .in('id', submittedIds)
  .is('email_opt_out_at', null)
  .order('registered_at', { ascending: true });
if (participantError) throw participantError;

const deliveryStatus = new Map((deliveries || []).map(row => [row.participant_id, row.status]));
const pending = (participants || []).filter(participant => !['processing', 'sent'].includes(deliveryStatus.get(participant.id)));
console.log(`Eligible submitted participants: ${participants.length}`);
console.log(`Pending shortlisted notices: ${pending.length}`);

if (!isConfirmed()) {
  console.log(`DRY RUN ONLY — no email sent. Use --confirm ${requiredConfirmation} to send the approved notice.`);
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
      const result = await sendEmail(participant.email, shortlistAnnouncementEmail(participant), `shortlist-announcement-20260921/${participant.id}`);
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
  console.log(`Shortlisted notice complete: ${sentCount} sent, ${failedCount} failed.`);
  if (failedCount) process.exitCode = 1;
}
