import crypto from 'node:crypto';
import { allowMethods, bearerToken, bodyOf, cleanText, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { getSupabase, getSupabasePublishableKey } from './_lib/supabase.js';
import { eventState, getEventConfig, windowOverrideEnabled } from './_lib/event.js';
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
    if (!windowOverrideEnabled(request) && eventState() !== 'live') return json(response, 403, { error: 'Submissions are not open.' });
    const participant = await findParticipantByToken(bearerToken(request));
    if (!participant) return json(response, 401, { error: 'Only registered participants can submit. Open the secure link in your challenge email.' });
    if (!await consumeRateLimit(request, 'submission-start', 20, 60 * 60, participant.id)) {
      return rateLimitResponse(response, 60 * 60);
    }

    const body = bodyOf(request);
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
      resumableEndpoint: resumableEndpoint()
    });
  } catch (error) {
    console.error('Submission initialization failed:', error.message);
    return json(response, 500, { error: 'The upload could not be started. Please try again. If the problem continues, contact entangle2k26@vkarch.com.' });
  }
}
