import { allowMethods, bodyOf, cleanText, json, normalizeEmail, normalizePhone, validEmail, validPhone } from './_lib/http.js';
import { getSupabase } from './_lib/supabase.js';
import { getEventConfig, windowOverrideEnabled } from './_lib/event.js';
import { issueParticipantToken } from './_lib/tokens.js';
import { accessUrl, registrationEmail } from './_lib/email-templates.js';
import { sendEmail } from './_lib/mailer.js';
import { syncResendContact } from './_lib/resend-contacts.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;
  try {
    const body = bodyOf(request);
    if (body.website) return json(response, 200, { ok: true });

    const name = cleanText(body.name, 120);
    const phone = normalizePhone(body.phone);
    const email = normalizeEmail(body.email);
    if (name.length < 2 || !validPhone(phone) || !validEmail(email) || body.ageConfirmed !== true || body.termsAccepted !== true) {
      return json(response, 400, { error: 'Please provide a valid name, email address, 10-digit Indian mobile number, and both confirmations.' });
    }
    const ipAllowed = await consumeRateLimit(request, 'register-ip', 20, 60 * 60);
    const emailAllowed = await consumeRateLimit(request, 'register-email', 5, 60 * 60, email);
    if (!ipAllowed || !emailAllowed) return rateLimitResponse(response, 60 * 60);

    const now = new Date();
    const config = getEventConfig();
    if (!windowOverrideEnabled(request) && now < new Date(config.registrationOpensAt)) {
      return json(response, 403, { error: 'Registration has not opened yet.' });
    }
    if (!windowOverrideEnabled(request) && now >= new Date(config.registrationClosesAt)) {
      return json(response, 403, { error: 'Registration is closed.' });
    }

    const supabase = getSupabase();
    const { data: existing, error: lookupError } = await supabase.from('participants').select('id,name,email,phone').eq('email', email).maybeSingle();
    if (lookupError) throw lookupError;

    let participant;
    let recentDelivery = null;
    if (existing) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recent } = await supabase.from('email_deliveries')
        .select('id,status').eq('participant_id', existing.id).like('email_type', 'registration:%')
        .gte('attempted_at', tenMinutesAgo).in('status', ['processing', 'sent']).limit(1);
      recentDelivery = recent?.[0] || null;
      participant = existing;
    } else {
      const { data, error } = await supabase.from('participants').insert({ name, phone, email, age_confirmed: true, terms_accepted: true }).select('id,name,email,phone').single();
      if (error) throw error;
      participant = data;
    }

    const emailConfigured = Boolean(process.env.RESEND_API_KEY);
    const localTokenResponse = token => windowOverrideEnabled(request) ? { token } : {};
    const responseMessage = emailConfigured
      ? 'Registration received. Check your inbox for the secure challenge link.'
      : 'Registration saved. Email delivery is not configured yet; local development can continue on this device.';

    if (recentDelivery) {
      return json(response, 200, {
        ok: true,
        emailConfigured,
        message: responseMessage
      });
    }

    const token = await issueParticipantToken(participant.id, 'registration');

    try {
      const synced = await syncResendContact(participant, ['registered'], { access_url: accessUrl(token) });
      if (!synced.skipped) {
        const { error: syncAuditError } = await supabase.from('participants').update({
          resend_contact_id: synced.contactId,
          resend_synced_at: new Date().toISOString(),
          resend_sync_error: null
        }).eq('id', participant.id);
        if (syncAuditError) console.error('Resend sync audit could not be saved:', syncAuditError.message);
      }
    } catch (contactError) {
      console.error('Resend contact sync failed:', contactError.message);
      const { error: syncAuditError } = await supabase.from('participants').update({
        resend_sync_error: String(contactError.message || contactError).slice(0, 1000)
      }).eq('id', participant.id);
      if (syncAuditError) console.error('Resend sync failure could not be recorded:', syncAuditError.message);
    }

    const emailType = `registration:${Date.now()}`;
    const { data: delivery, error: deliveryError } = await supabase.from('email_deliveries').insert({ participant_id: participant.id, email_type: emailType, status: 'processing' }).select('id').single();
    if (deliveryError) throw deliveryError;

    try {
      const sent = await sendEmail(participant.email, registrationEmail(participant, token), `registration/${participant.id}/${emailType}`);
      await supabase.from('email_deliveries').update({ status: 'sent', provider_id: sent.id, sent_at: new Date().toISOString() }).eq('id', delivery.id);
    } catch (emailError) {
      console.error('Registration email was not sent:', emailError.message);
      await supabase.from('email_deliveries').update({ status: 'failed', error: String(emailError.message || emailError).slice(0, 1000) }).eq('id', delivery.id);
    }

    return json(response, 200, {
      ok: true,
      emailConfigured,
      ...localTokenResponse(token),
      message: responseMessage
    });
  } catch (error) {
    console.error('Registration failed:', error.message);
    return json(response, 500, { error: 'Registration could not be completed right now. Please try again shortly.' });
  }
}
