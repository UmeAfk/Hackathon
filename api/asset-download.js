import { allowMethods, bearerToken, bodyOf, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { eventState, windowOverrideEnabled } from './_lib/event.js';
import { getSupabase } from './_lib/supabase.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

const assets = {
  'Entangle_2K26_Challenge_Task.pdf': { folder: 'brief', extension: '.pdf' },
  'ArchViz_Base_Building_v1.0.fbx': { folder: 'models', extension: '.fbx' },
  'ArchViz_Base_Building_v1.0.obj': { folder: 'models', extension: '.obj' },
  'ArchViz_Base_Building_v1.0.glb': { folder: 'models', extension: '.glb' }
};

const resolvedPaths = new Map();

async function resolveAssetPath(storage, requestedFilename, asset) {
  const cached = resolvedPaths.get(requestedFilename);
  if (cached) return cached;

  const { data: files, error } = await storage.list(asset.folder, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  const preferred = files?.find(file => file.name === requestedFilename);
  const fallback = files?.find(file => file.name.toLowerCase().endsWith(asset.extension));
  const selected = preferred || fallback;
  if (!selected) return null;

  const path = `${asset.folder}/${selected.name}`;
  resolvedPaths.set(requestedFilename, path);
  return path;
}

async function createDownloadUrl(storage, path) {
  const filename = path.slice(path.lastIndexOf('/') + 1);
  let signed = await storage.createSignedUrl(path, 5 * 60, { download: filename });
  if (signed.error) signed = await storage.createSignedUrl(path, 5 * 60, { download: filename });
  if (signed.error) throw signed.error;
  return { url: signed.data.signedUrl, filename };
}

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['POST'])) return;
  try {
    if (!windowOverrideEnabled(request) && eventState() !== 'live') return json(response, 403, { error: 'The base model is available only while the challenge is live.' });
    const participant = await findParticipantByToken(bearerToken(request));
    if (!participant) return json(response, 401, { error: 'Open the secure link in your task email to download the model.' });
    if (!await consumeRateLimit(request, 'asset-download', 60, 60 * 60, participant.id)) {
      return rateLimitResponse(response, 60 * 60);
    }
    const requestedFilename = String(bodyOf(request).filename || '');
    const asset = assets[requestedFilename];
    if (!asset) return json(response, 404, { error: 'That challenge file is not available.' });

    const storage = getSupabase().storage.from('challenge-assets');
    const path = await resolveAssetPath(storage, requestedFilename, asset);
    if (!path) return json(response, 404, { error: `${requestedFilename} is not available yet.` });

    try {
      const download = await createDownloadUrl(storage, path);
      return json(response, 200, { ok: true, ...download });
    } catch (signError) {
      resolvedPaths.delete(requestedFilename);
      const refreshedPath = await resolveAssetPath(storage, requestedFilename, asset);
      if (!refreshedPath) return json(response, 404, { error: `${requestedFilename} is not available yet.` });
      const download = await createDownloadUrl(storage, refreshedPath);
      return json(response, 200, { ok: true, ...download });
    }
  } catch (error) {
    console.error('Asset download failed:', error.message);
    return json(response, 500, { error: 'The download could not be prepared. Please try again. If the problem continues, contact entangle2k26@vkarch.com.' });
  }
}
