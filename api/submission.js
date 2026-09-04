import crypto from 'node:crypto';
import { allowMethods, bearerToken, bodyOf, cleanText, json, normalizeEmail, normalizePhone, validEmail, validPhone } from './_lib/http.js';
import { findParticipantByToken, issueParticipantToken } from './_lib/tokens.js';
import { getSupabase, getSupabasePublishableKey } from './_lib/supabase.js';
import { getEventConfig, submissionsAreOpen, windowOverrideEnabled } from './_lib/event.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

const allowedExtensions = new Set(['zip', 'rar', '7z', 'tar', 'gz']);

function safeFilename(filename) {
  const cleaned = cleanText(filename, 180).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'submission.zip';
}

function resumableEndpoint() {
  const projectUrl = new URL(process.env.SUPABASE_URL);
  const standardHost = projectUrl.hostname.match(/^([^.]+)\.supabase\.co$/i);
  if (standardHost) return `https://${standardHost[1]}.storage.supabase.co/storage/v1/upload/resumable`;
  return `${projectUrl.origin}/storage/v1/upload/resumable`;
}

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;
  try {
    if (!windowOverrideEnabled(request) && !submissionsAreOpen()) {
      const config = getEventConfig();
      const beforeOpening = Date.now() < new Date(config.submissionOpensAt).getTime();
      return json(response, 403, { error: beforeOpening ? 'Submissions open on 6 September 2026 at 11:59 AM IST.' : 'The submission deadline has passed.' });
    }
    const body = bodyOf(request);
    let participant = await findParticipantByToken(bearerToken(request));
    let accessToken = '';
    if (!participant) {
      const name = cleanText(body.participantName, 120);
      const email = normalizeEmail(body.participantEmail);
      const phone = normalizePhone(body.participantPhone);
      const [ipAllowed, identityAllowed] = await Promise.all([
        consumeRateLimit(request, 'submission-identity-ip', 30, 60 * 60),
        consumeRateLimit(request, 'submission-identity', 12, 60 * 60, email || undefined)
      ]);
      if (!ipAllowed || !identityAllowed) return rateLimitResponse(response, 60 * 60);
      if (name.length < 2 || !validEmail(email) || !validPhone(phone)) {
        return json(response, 401, { error: 'Enter the same name, email address, and mobile number used during registration.' });
      }
      const { data: matched, error: matchError } = await getSupabase().from('participants')
        .select('id,name,email,phone')
        .eq('email', email)
        .eq('phone', phone)
        .is('email_opt_out_at', null)
        .maybeSingle();
      if (matchError) throw matchError;
      const sameName = cleanText(matched?.name, 120).toLocaleLowerCase('en-IN') === name.toLocaleLowerCase('en-IN');
      if (!matched || !sameName) {
        return json(response, 401, { error: 'Enter the same name, email address, and mobile number used during registration.' });
      }
      participant = matched;
      accessToken = await issueParticipantToken(participant.id, 'submission-identity');
    }
    if (!await consumeRateLimit(request, 'submission-start', 20, 60 * 60, participant.id)) {
      return rateLimitResponse(response, 60 * 60);
    }

    const originalFilename = cleanText(body.filename, 255);
    const extension = originalFilename.split('.').pop().toLowerCase();
    const fileSize = Number(body.fileSize);
    const aiUsage = cleanText(body.aiUsage, 40);
    const config = getEventConfig();
    if (!allowedExtensions.has(extension)) return json(response, 400, { error: 'Upload a .zip, .rar, .7z, .tar, or .gz archive.' });
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > config.maxUploadBytes) return json(response, 400, { error: 'Archive must be 5 GB or smaller.' });
    if (!['none', 'concept', 'textures'].includes(aiUsage)) return json(response, 400, { error: 'Select a valid AI disclosure.' });

    const supabase = getSupabase();
    const { data: existing, error: existingError } = await supabase.from('submissions')
      .select('id,status,storage_path,original_filename,file_size')
      .eq('participant_id', participant.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status === 'uploaded') return json(response, 409, { error: 'A completed submission is already recorded for this registration.' });

    const samePendingFile = existing?.status === 'initiated'
      && existing.original_filename === originalFilename
      && Number(existing.file_size) === fileSize
      && existing.storage_path;
    const storagePath = samePendingFile
      ? existing.storage_path
      : `${participant.id}/${crypto.randomUUID()}-${safeFilename(originalFilename)}`;
    const row = {
      participant_id: participant.id,
      uploader_name: participant.name,
      uploader_email: participant.email,
      ai_usage: aiUsage,
      original_filename: originalFilename,
      storage_path: storagePath,
      file_size: fileSize,
      mime_type: cleanText(body.mimeType, 120) || 'application/octet-stream',
      status: 'initiated',
      updated_at: new Date().toISOString()
    };
    const query = existing
      ? supabase.from('submissions').update(row).eq('id', existing.id).select('id').single()
      : supabase.from('submissions').insert(row).select('id').single();
    const { data: submission, error: rowError } = await query;
    if (rowError) throw rowError;

    const { data: signed, error: signError } = await supabase.storage.from('challenge-submissions').createSignedUploadUrl(storagePath);
    if (signError) throw signError;
    return json(response, 200, {
      ok: true,
      submissionId: submission.id,
      storagePath,
      bucketName: 'challenge-submissions',
      uploadToken: signed.token,
      apiKey: getSupabasePublishableKey(),
      resumableEndpoint: resumableEndpoint(),
      ...(accessToken ? { accessToken } : {})
    });
  } catch (error) {
    console.error('Submission initialization failed:', error.message);
    return json(response, 500, { error: 'The upload could not be started. Please try again. If the problem continues, contact entangle2k26@vkarch.com.' });
  }
}
