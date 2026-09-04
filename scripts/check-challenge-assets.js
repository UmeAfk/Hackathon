import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedAssets = {
  brief: ['Entangle_2K26_Challenge_Task.pdf'],
  models: [
    'Entangle Blender File.blend',
    'Entangle FBX.fbx',
    'Entangle GLB.glb',
    'Entangle GLTF.bin',
    'Entangle GLTF.gltf',
    'Entangle OBJ.mtl',
    'Entangle OBJ.obj',
    'Entangle Reference Image.jpg'
  ]
};

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) return trimmed.slice(1, -1);
  return trimmed;
}

const source = await readFile(path.join(projectRoot, '.env.local'), 'utf8');
for (const line of source.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = unquote(match[2]);
}

const storage = getSupabase().storage.from('challenge-assets');
for (const [folder, expectedNames] of Object.entries(expectedAssets)) {
  const { data: files, error: listError } = await storage.list(folder, { limit: 100 });
  if (listError) throw listError;
  const filesByName = new Map((files || []).map(file => [file.name, file]));

  for (const filename of expectedNames) {
    const file = filesByName.get(filename);
    if (!file) throw new Error(`Missing challenge-assets/${folder}/${filename}`);

    const { data: signed, error: signedError } = await storage.createSignedUrl(
      `${folder}/${filename}`,
      5 * 60,
      { download: filename }
    );
    if (signedError) throw signedError;
    const response = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-0' } });
    if (!response.ok) throw new Error(`Signed download for ${filename} returned HTTP ${response.status}`);

    const size = Number(file.metadata?.size || 0);
    const displaySize = size ? `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB` : 'available';
    console.log(`OK  challenge-assets/${folder}/${filename}  (${displaySize}, HTTP ${response.status})`);
  }
}

async function readModelText(filename, range) {
  const { data: signed, error } = await storage.createSignedUrl(`models/${filename}`, 5 * 60);
  if (error) throw error;
  const response = await fetch(signed.signedUrl, range ? { headers: { Range: range } } : undefined);
  if (!response.ok) throw new Error(`Could not inspect ${filename}: HTTP ${response.status}`);
  return response.text();
}

const gltf = JSON.parse(await readModelText('Entangle GLTF.gltf'));
if (!gltf.buffers?.some(buffer => decodeURIComponent(buffer.uri || '') === 'Entangle GLTF.bin')) {
  throw new Error('Entangle GLTF.gltf does not reference Entangle GLTF.bin');
}

const objHeader = await readModelText('Entangle OBJ.obj', 'bytes=0-8191');
if (!/^mtllib\s+Entangle OBJ\.mtl\s*$/mi.test(objHeader)) {
  throw new Error('Entangle OBJ.obj does not reference Entangle OBJ.mtl');
}

console.log('OK  glTF and OBJ companion-file references match their uploaded filenames');
