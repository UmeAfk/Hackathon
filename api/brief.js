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
    const { error } = await getSupabase().from('submissions').upsert({ participant_id: participant.id, design_brief: brief }, { onConflict: 'participant_id' });
    if (error) throw error;
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Brief failed:', error.message);
    return json(response, 500, { error: 'Your design brief could not be saved. Please try again.' });
  }
}
