import { allowMethods, bearerToken, bodyOf, cleanText, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { getSupabase } from './_lib/supabase.js';
import { eventState, windowOverrideEnabled } from './_lib/event.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;
  try {
    if (!windowOverrideEnabled(request) && eventState() !== 'live') return json(response, 403, { error: 'Design briefs are only accepted while the challenge is live.' });
    const participant = await findParticipantByToken(bearerToken(request));
    if (!participant) return json(response, 401, { error: 'Open the secure link in your challenge email first.' });
    if (!await consumeRateLimit(request, 'design-brief', 30, 60 * 60, participant.id)) {
      return rateLimitResponse(response, 60 * 60);
    }
    const brief = cleanText(bodyOf(request).brief, 2000);
    if (brief.length < 5) return json(response, 400, { error: 'Please write a few thoughts about what you plan to build.' });

    const supabase = getSupabase();
    const { data: existing, error: existingError } = await supabase.from('submissions')
      .select('id,design_brief')
      .eq('participant_id', participant.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.design_brief) {
      return json(response, 409, {
        code: 'brief_already_submitted',
        error: 'Your design brief has already been submitted. You can view it, but it cannot be changed.'
      });
    }

    const row = {
      participant_id: participant.id,
      uploader_name: participant.name,
      uploader_email: participant.email,
      design_brief: brief,
      updated_at: new Date().toISOString()
    };
    let saved;
    let saveError;
    if (existing) {
      ({ data: saved, error: saveError } = await supabase.from('submissions')
        .update(row)
        .eq('id', existing.id)
        .is('design_brief', null)
        .select('id')
        .maybeSingle());
    } else {
      ({ data: saved, error: saveError } = await supabase.from('submissions')
        .insert({ ...row, status: 'draft' })
        .select('id')
        .single());
    }
    if (saveError?.code === '23505') {
      return json(response, 409, {
        code: 'brief_already_submitted',
        error: 'Your design brief has already been submitted. You can view it, but it cannot be changed.'
      });
    }
    if (saveError) throw saveError;
    if (!saved) {
      return json(response, 409, {
        code: 'brief_already_submitted',
        error: 'Your design brief has already been submitted. You can view it, but it cannot be changed.'
      });
    }
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Brief failed:', error.message);
    return json(response, 500, { error: 'Your design brief could not be saved. Please try again. If the problem continues, contact entangle2k26@vkarch.com.' });
  }
}
