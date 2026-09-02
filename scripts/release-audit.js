import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabase, getSupabasePublishableKey } from '../api/_lib/supabase.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIVE_GIB = 5 * 1024 * 1024 * 1024;
const failures = [];

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) return trimmed.slice(1, -1);
  return trimmed;
}

async function loadLocalEnvironment() {
  const source = await readFile(path.join(projectRoot, '.env.local'), 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = unquote(match[2]);
  }
}

function requireCheck(condition, message) {
  if (!condition) {
    failures.push(message);
    console.error(`FAIL  ${message}`);
    return false;
  }
  console.log(`PASS  ${message}`);
  return true;
}

function senderDomain(value) {
  const match = String(value || '').match(/@([^>\s]+)>?$/);
  return match?.[1]?.toLowerCase() || '';
}

await loadLocalEnvironment();

for (const name of [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'RESEND_REPLY_TO'
]) {
  requireCheck(Boolean(process.env[name]?.trim()), `${name} is configured`);
}

requireCheck(getSupabasePublishableKey() !== process.env.SUPABASE_SECRET_KEY, 'browser and server Supabase keys are separated');

const supabase = getSupabase();
const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) throw bucketError;
const bucketMap = new Map((buckets || []).map(bucket => [bucket.id, bucket]));
const submissionBucket = bucketMap.get('challenge-submissions');
const assetBucket = bucketMap.get('challenge-assets');
requireCheck(Boolean(submissionBucket), 'challenge-submissions bucket exists');
requireCheck(submissionBucket.public === false, 'challenge-submissions bucket is private');
requireCheck(Number(submissionBucket.file_size_limit) === FIVE_GIB, 'challenge-submissions bucket limit is exactly 5 GiB');
requireCheck(Boolean(assetBucket), 'challenge-assets bucket exists');
requireCheck(assetBucket.public === false, 'challenge-assets bucket is private');

const challengeAssets = supabase.storage.from('challenge-assets');
const expectedFolders = [
  ['brief', ['.pdf']],
  ['models', ['.fbx', '.obj', '.glb']]
];
for (const [folder, extensions] of expectedFolders) {
  const { data: files, error } = await challengeAssets.list(folder, { limit: 100 });
  if (error) throw error;
  for (const extension of extensions) {
    const file = files?.find(item => item.name.toLowerCase().endsWith(extension));
    requireCheck(Boolean(file), `${extension} challenge asset exists in ${folder}`);
    requireCheck(Number(file?.metadata?.size || 0) > 0, `${extension} challenge asset is not empty`);
  }
}

for (const table of ['participants', 'participant_tokens', 'submissions', 'email_deliveries']) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
  if (error) throw error;
  requireCheck(true, `${table} table is reachable`);
}

const publicAssetProbe = await fetch(
  `${process.env.SUPABASE_URL}/storage/v1/object/public/challenge-assets/brief/Entangle_2K26_Challenge_Task.pdf`,
  {
    headers: { apikey: getSupabasePublishableKey(), Range: 'bytes=0-0' },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000)
  }
);
requireCheck(!publicAssetProbe.ok, 'challenge assets reject unauthenticated public downloads');

const domainResponse = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  signal: AbortSignal.timeout(10_000)
});
const domainPayload = await domainResponse.json().catch(() => ({}));
if (!domainResponse.ok) throw new Error(domainPayload.message || `Resend domain check returned ${domainResponse.status}`);
const expectedDomain = senderDomain(process.env.RESEND_FROM_EMAIL);
const domains = Array.isArray(domainPayload.data) ? domainPayload.data : [];
const sendingDomain = domains.find(domain => domain.name?.toLowerCase() === expectedDomain);
requireCheck(Boolean(sendingDomain), 'Resend contains the configured sending domain');
requireCheck(sendingDomain?.status === 'verified', 'Resend sending domain is verified');

if (failures.length) {
  console.error(`Release service audit found ${failures.length} blocking check${failures.length === 1 ? '' : 's'}.`);
  process.exitCode = 1;
} else {
  console.log('Release service audit completed without exposing secrets or participant records.');
}
