import { allowMethods, bearerToken, bodyOf, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { eventState, windowOverrideEnabled } from './_lib/event.js';
import { getSupabase } from './_lib/supabase.js';

const formats = {
  'ArchViz_Base_Building_v1.0.fbx': '.fbx',
  'ArchViz_Base_Building_v1.0.obj': '.obj',
  'ArchViz_Base_Building_v1.0.glb': '.glb'
};

const resolvedPaths = new Map();

async function resolveModelPath(storage, requestedFilename, extension) {
  const cached = resolvedPaths.get(extension);
  if (cached) return cached;

  const { data: files, error } = await storage.list('models', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  const preferred = files?.find(file => file.name === requestedFilename);
  const fallback = files?.find(file => file.name.toLowerCase().endsWith(extension));
  const selected = preferred || fallback;
  if (!selected) return null;

  const path = `models/${selected.name}`;
  resolvedPaths.set(extension, path);
  return path;
}

async function createDownloadUrl(storage, path) {
  const filename = path.slice(path.lastIndexOf('/') + 1);
  let signed = await storage.createSignedUrl(path, 15 * 60, { download: filename });
  if (signed.error) signed = await storage.createSignedUrl(path, 15 * 60, { download: filename });
  if (signed.error) throw signed.error;
  return { url: signed.data.signedUrl, filename };
}

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;
  try {
    if (!windowOverrideEnabled() && eventState() !== 'live') return json(response, 403, { error: 'The base model is available only while the challenge is live.' });
    const participant = await findParticipantByToken(bearerToken(request));
    if (!participant) return json(response, 401, { error: 'Open the secure link in your task email to download the model.' });
    const requestedFilename = String(bodyOf(request).filename || '');
    const extension = formats[requestedFilename];
    if (!extension) return json(response, 404, { error: 'That model format is not available.' });

    const storage = getSupabase().storage.from('challenge-assets');
    const path = await resolveModelPath(storage, requestedFilename, extension);
    if (!path) return json(response, 404, { error: `No ${extension} model has been uploaded to challenge-assets/models yet.` });

    try {
      const download = await createDownloadUrl(storage, path);
      return json(response, 200, { ok: true, ...download });
    } catch (signError) {
      resolvedPaths.delete(extension);
      const refreshedPath = await resolveModelPath(storage, requestedFilename, extension);
      if (!refreshedPath) return json(response, 404, { error: `No ${extension} model has been uploaded to challenge-assets/models yet.` });
      const download = await createDownloadUrl(storage, refreshedPath);
      return json(response, 200, { ok: true, ...download });
    }
  } catch (error) {
    console.error('Asset download failed:', error.message);
    return json(response, 500, { error: 'The model download could not be prepared. Please try again shortly.' });
  }
}
