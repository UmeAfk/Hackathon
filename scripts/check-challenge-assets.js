import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase } from '../api/_lib/supabase.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedBrief = 'Entangle_2K26_Challenge_Task.pdf';

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
const { data: files, error: listError } = await storage.list('brief', { limit: 100 });
if (listError) throw listError;
const brief = files?.find(file => file.name === expectedBrief);
if (!brief) throw new Error(`Missing challenge-assets/brief/${expectedBrief}`);

const { data: signed, error: signedError } = await storage.createSignedUrl(`brief/${expectedBrief}`, 5 * 60, { download: expectedBrief });
if (signedError) throw signedError;
const response = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-0' } });
if (!response.ok) throw new Error(`Signed PDF download returned HTTP ${response.status}`);

const size = Number(brief.metadata?.size || 0);
console.log(`PDF found: challenge-assets/brief/${expectedBrief}`);
console.log(`Stored size: ${size ? `${(size / 1024).toFixed(1)} KiB` : 'available'}`);
console.log(`Signed download test: HTTP ${response.status}`);
