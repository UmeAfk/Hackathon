import { allowMethods, bearerToken, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { getSupabase } from './_lib/supabase.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['GET'])) return;
  try {
    const participant = await findParticipantByToken(bearerToken(request));
    if (!participant) return json(response, 401, { error: 'Your participant link is invalid or expired.' });
    if (!await consumeRateLimit(request, 'participant-lookup', 120, 60 * 60, participant.id)) {
      return rateLimitResponse(response, 60 * 60);
    }
    const { data: submission, error } = await getSupabase().from('submissions')
      .select('design_brief,status')
      .eq('participant_id', participant.id)
      .maybeSingle();
    if (error) throw error;
    return json(response, 200, {
      participant: { name: participant.name, email: participant.email, phone: participant.phone },
      designBrief: submission?.design_brief || '',
      submissionStatus: submission?.status || null
    });
  } catch (error) {
    console.error('Participant lookup failed:', error.message);
    return json(response, 500, { error: 'Your participant details could not be loaded. Please try again. If the problem continues, contact entangle2k26@vkarch.com.' });
  }
}
