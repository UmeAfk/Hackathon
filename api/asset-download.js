import { allowMethods, bearerToken, bodyOf, json } from './_lib/http.js';
import { findParticipantByToken } from './_lib/tokens.js';
import { eventState, windowOverrideEnabled } from './_lib/event.js';
import { getSupabase } from './_lib/supabase.js';
import { consumeRateLimit, rateLimitResponse } from './_lib/rate-limit.js';

const assetGroups = {
  task: [{ folder: 'brief', filename: 'Entangle_2K26_Challenge_Task.pdf' }],
  blend: [{ folder: 'models', filename: 'Entangle Blender File.blend' }],
  fbx: [{ folder: 'models', filename: 'Entangle FBX.fbx' }],
  glb: [{ folder: 'models', filename: 'Entangle GLB.glb' }],
  gltf: [
    { folder: 'models', filename: 'Entangle GLTF.gltf' },
    { folder: 'models', filename: 'Entangle GLTF.bin' }
  ],
  obj: [
    { folder: 'models', filename: 'Entangle OBJ.obj' },
    { folder: 'models', filename: 'Entangle OBJ.mtl' }
  ],
  reference: [{ folder: 'models', filename: 'Entangle Reference Image.jpg' }]
};

// Keep cached pages working during a deployment without accepting arbitrary paths.
const legacyFilenames = {
  'Entangle_2K26_Challenge_Task.pdf': 'task',
  'ArchViz_Base_Building_v1.0.fbx': 'fbx',
  'ArchViz_Base_Building_v1.0.obj': 'obj',
  'ArchViz_Base_Building_v1.0.glb': 'glb'
};

async function assertFilesExist(storage, files) {
  const folders = [...new Set(files.map(file => file.folder))];
  const listings = await Promise.all(folders.map(async folder => {
    const { data, error } = await storage.list(folder, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    return [folder, new Set((data || []).map(file => file.name))];
  }));
  const availableByFolder = new Map(listings);
  return files.find(file => !availableByFolder.get(file.folder)?.has(file.filename)) || null;
}

async function createDownload(storage, file) {
  const path = `${file.folder}/${file.filename}`;
  let signed = await storage.createSignedUrl(path, 5 * 60, { download: file.filename });
  if (signed.error) signed = await storage.createSignedUrl(path, 5 * 60, { download: file.filename });
  if (signed.error) throw signed.error;
  return { url: signed.data.signedUrl, filename: file.filename };
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
    const body = bodyOf(request);
    const requestedAsset = String(body.asset || legacyFilenames[String(body.filename || '')] || '');
    const files = assetGroups[requestedAsset];
    if (!files) return json(response, 404, { error: 'That challenge file is not available.' });

    const storage = getSupabase().storage.from('challenge-assets');
    const missing = await assertFilesExist(storage, files);
    if (missing) return json(response, 404, { error: `${missing.filename} is not available yet.` });

    const downloads = await Promise.all(files.map(file => createDownload(storage, file)));
    return json(response, 200, {
      ok: true,
      files: downloads,
      ...(downloads.length === 1 ? downloads[0] : {})
    });
  } catch (error) {
    console.error('Asset download failed:', error.message);
    return json(response, 500, { error: 'The download could not be prepared. Please try again. If the problem continues, contact entangle2k26@vkarch.com.' });
  }
}
