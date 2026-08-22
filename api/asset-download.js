import { allowMethods, bearerToken, bodyOf, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { eventState, windowOverrideEnabled } from './_lib/event.js';
import { getSupabase } from './_lib/supabase.js';

const formats = {
  'ArchViz_Base_Building_v1.0.fbx': '.fbx',
  'ArchViz_Base_Building_v1.0.obj': '.obj',
  'ArchViz_Base_Building_v1.0.glb': '.glb'
};

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
    const { data: files, error: listError } = await storage.list('models', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    if (listError) throw listError;
    const preferred = files?.find(file => file.name === requestedFilename);
    const fallback = files?.find(file => file.name.toLowerCase().endsWith(extension));
    const selected = preferred || fallback;
    if (!selected) return json(response, 404, { error: `No ${extension} model has been uploaded to challenge-assets/models yet.` });

    const path = `models/${selected.name}`;
    const { data, error } = await storage.createSignedUrl(path, 15 * 60, { download: selected.name });
    if (error) throw error;
    return json(response, 200, { ok: true, url: data.signedUrl, filename: selected.name });
  } catch (error) {
    console.error('Asset download failed:', error.message);
    return json(response, 500, { error: 'The model download could not be prepared. Please try again shortly.' });
  }
}
