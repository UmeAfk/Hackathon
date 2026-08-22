import crypto from 'node:crypto';
import { getSupabase } from './supabase.js';
import { getEventConfig } from './event.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueParticipantToken(participantId, purpose = 'event-access') {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresBase = new Date(getEventConfig().thankYouAt).getTime();
  const expiresAt = new Date(expiresBase + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await getSupabase().from('participant_tokens').insert({
    participant_id: participantId,
    token_hash: tokenHash,
    purpose,
    expires_at: expiresAt
  });
  if (error) throw error;
  return token;
}

export async function findParticipantByToken(token) {
  if (!token || token.length < 32 || token.length > 128) return null;
  const supabase = getSupabase();
  const { data: access, error: tokenError } = await supabase
    .from('participant_tokens')
    .select('participant_id')
    .eq('token_hash', hashToken(token))
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (tokenError || !access) return null;

  const { data: participant, error } = await supabase
    .from('participants')
    .select('id,name,email,phone')
    .eq('id', access.participant_id)
    .is('email_opt_out_at', null)
    .maybeSingle();
  if (error) throw error;
  return participant;
}
