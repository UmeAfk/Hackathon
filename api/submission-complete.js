import { allowMethods, bearerToken, bodyOf, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { getSupabase } from './_lib/supabase.js';
import { accessUrl, submissionReceiptEmail } from './_lib/email-templates.js';
import { sendEmail } from './_lib/mailer.js';
import { eventState, windowOverrideEnabled } from './_lib/event.js';
import { syncResendContact } from './_lib/resend-contacts.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;
  try {
    if (!windowOverrideEnabled(request) && eventState() !== 'live') return json(response, 403, { error: 'The submission deadline has passed.' });
    const participantToken = bearerToken(request);
    const participant = await findParticipantByToken(participantToken);
    if (!participant) return json(response, 401, { error: 'Your participant link is invalid or expired.' });
    if (!await consumeRateLimit(request, 'submission-complete', 30, 60 * 60, participant.id)) {
      return rateLimitResponse(response, 60 * 60);
    }
    const submissionId = String(bodyOf(request).submissionId || '');
    const supabase = getSupabase();
    const { data: submission, error } = await supabase.from('submissions')
      .select('id,participant_id,storage_path,original_filename,file_size,status,receipt_sent_at')
      .eq('id', submissionId).eq('participant_id', participant.id).maybeSingle();
    if (error) throw error;
    if (!submission) return json(response, 404, { error: 'Submission record not found.' });

    const slash = submission.storage_path.lastIndexOf('/');
    const folder = submission.storage_path.slice(0, slash);
    const filename = submission.storage_path.slice(slash + 1);
    const { data: objects, error: listError } = await supabase.storage.from('challenge-submissions').list(folder, { search: filename, limit: 5 });
    if (listError) throw listError;
    const uploadedObject = objects?.find(object => object.name === filename);
    if (!uploadedObject) return json(response, 409, { error: 'The archive has not finished uploading. Please wait and try again.' });
    const storedSize = Number(uploadedObject.metadata?.size);
    if (Number.isFinite(storedSize) && storedSize !== Number(submission.file_size)) {
      return json(response, 409, { error: 'The stored archive size does not match the selected file. Please retry the upload.' });
    }

    const uploadedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from('submissions').update({ status: 'uploaded', uploaded_at: uploadedAt, updated_at: uploadedAt }).eq('id', submission.id);
    if (updateError) throw updateError;

    try {
      const synced = await syncResendContact(participant, ['registered', 'submitters'], { access_url: accessUrl(participantToken) });
      if (!synced.skipped) {
        const { error: syncAuditError } = await supabase.from('participants').update({
          resend_contact_id: synced.contactId,
          resend_synced_at: new Date().toISOString(),
          resend_sync_error: null
        }).eq('id', participant.id);
        if (syncAuditError) console.error('Resend submitter audit could not be saved:', syncAuditError.message);
      }
    } catch (contactError) {
      console.error('Resend submitter sync failed:', contactError.message);
      const { error: syncAuditError } = await supabase.from('participants').update({
        resend_sync_error: String(contactError.message || contactError).slice(0, 1000)
      }).eq('id', participant.id);
      if (syncAuditError) console.error('Resend submitter failure could not be recorded:', syncAuditError.message);
    }

    if (!submission.receipt_sent_at) {
      const emailType = 'submission_receipt';
      const { data: existingDelivery } = await supabase.from('email_deliveries').select('id,status').eq('participant_id', participant.id).eq('email_type', emailType).maybeSingle();
      if (existingDelivery?.status !== 'sent') {
        const { data: delivery, error: deliveryError } = await supabase.from('email_deliveries').upsert({ participant_id: participant.id, email_type: emailType, status: 'processing', attempted_at: uploadedAt }, { onConflict: 'participant_id,email_type' }).select('id').single();
        if (deliveryError) throw deliveryError;
        try {
          const sent = await sendEmail(participant.email, submissionReceiptEmail(participant, submission), `submission-receipt/${submission.id}`);
          await Promise.all([
            supabase.from('email_deliveries').update({ status: 'sent', provider_id: sent.id, sent_at: new Date().toISOString() }).eq('id', delivery.id),
            supabase.from('submissions').update({ receipt_sent_at: new Date().toISOString() }).eq('id', submission.id)
          ]);
        } catch (emailError) {
          await supabase.from('email_deliveries').update({ status: 'failed', error: String(emailError.message || emailError).slice(0, 1000) }).eq('id', delivery.id);
        }
      }
    }
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Submission finalization failed:', error.message);
    return json(response, 500, { error: 'Your upload finished, but the receipt could not be finalized. Please retry.' });
  }
}
