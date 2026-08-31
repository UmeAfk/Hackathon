import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rateLimitResponse } from '../api/_lib/rate-limit.js';
import { getSupabasePublishableKey } from '../api/_lib/supabase.js';

test('rate-limit responses are non-cacheable and include retry guidance', () => {
  const headers = new Map();
  const response = {
    setHeader(name, value) { headers.set(name.toLowerCase(), String(value)); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; }
  };
  rateLimitResponse(response, 3600);
  assert.equal(response.statusCode, 429);
  assert.equal(headers.get('retry-after'), '3600');
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.match(response.body.error, /too many requests/i);
});

test('deployment headers restrict scripts, framing, and browser permissions', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const headers = new Map(config.headers[0].headers.map(item => [item.key.toLowerCase(), item.value]));
  const csp = headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.match(headers.get('permissions-policy'), /camera=\(\)/);
});

test('production page uses local vendored scripts instead of a remote script CDN', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /public\/vendor\/anime\.min\.js/);
  assert.doesNotMatch(html, /<script[^>]+https:\/\//i);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.match(html, /js\/theme-bootstrap\.js/);
});

test('local phase controls are hard-hidden outside localhost', async () => {
  const [html, phaseEngine, debugStyles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/phaseEngine.js', import.meta.url), 'utf8'),
    readFile(new URL('../css/debug.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="debugPill"[^>]*hidden/);
  assert.match(phaseEngine, /debugAllowed = \['localhost', '127\.0\.0\.1'\]/);
  assert.match(phaseEngine, /debugPill\.hidden = !debugAllowed/);
  assert.match(debugStyles, /\.debug-pill\[hidden\][\s\S]*?display:\s*none\s*!important/);
});

test('unexpected browser errors stay friendly and include event support', async () => {
  const client = await readFile(new URL('../js/api.js', import.meta.url), 'utf8');
  assert.match(client, /contact entangle2k26@vkarch\.com/);
  assert.doesNotMatch(client, /new Error\(error\?\.message/);
  assert.doesNotMatch(client, /catch\(error => finish\(reject, error\)\)/);
});

test('rate limiting fails closed when its database guard is unavailable', async () => {
  const source = await readFile(new URL('../api/_lib/rate-limit.js', import.meta.url), 'utf8');
  assert.match(source, /Fail closed/);
  assert.doesNotMatch(source, /catch \(error\)[\s\S]*?return true/);
});

test('submission storage stays private and capped at five GiB', async () => {
  const initialMigration = await readFile(
    new URL('../supabase/migrations/202608220001_event_backend.sql', import.meta.url),
    'utf8'
  );
  const resumableMigration = await readFile(
    new URL('../supabase/migrations/202608230003_resumable_5gb_submissions.sql', import.meta.url),
    'utf8'
  );
  const enforcementMigration = await readFile(
    new URL('../supabase/migrations/202608240005_enforce_submission_bucket_limit.sql', import.meta.url),
    'utf8'
  );
  const signedTusMigration = await readFile(
    new URL('../supabase/migrations/202608240006_signed_resumable_submission_policy.sql', import.meta.url),
    'utf8'
  );

  assert.match(initialMigration, /'challenge-submissions',[\s\S]*?false,[\s\S]*?5368709120/);
  assert.match(resumableMigration, /public\s*=\s*false/);
  assert.match(resumableMigration, /file_size_limit\s*=\s*5368709120/);
  assert.match(enforcementMigration, /public\s*=\s*false/);
  assert.match(enforcementMigration, /file_size_limit\s*=\s*5368709120/);
  assert.match(signedTusMigration, /storage\.allow_any_operation\(array\[[\s\S]*?'storage\.tus\.upload\.create'[\s\S]*?'storage\.tus\.upload\.part'/);
  assert.match(signedTusMigration, /is_initiated_submission_path\(name\)/);
  assert.doesNotMatch(signedTusMigration, /with check\s*\(\s*true\s*\)/i);
});

test('signed resumable uploads include a public API key and never expose a secret key', async () => {
  const originalPublishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const originalAnon = process.env.SUPABASE_ANON_KEY;
  try {
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test-safe-browser-key';
    delete process.env.SUPABASE_ANON_KEY;
    assert.equal(getSupabasePublishableKey(), 'sb_publishable_test-safe-browser-key');

    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_must-not-leak';
    assert.throws(() => getSupabasePublishableKey(), /publishable key or legacy anon key/i);

    const client = await readFile(new URL('../js/api.js', import.meta.url), 'utf8');
    const submissionApi = await readFile(new URL('../api/submission.js', import.meta.url), 'utf8');
    assert.match(client, /apikey:\s*intent\.apiKey/);
    assert.match(client, /'x-signature':\s*intent\.uploadToken/);
    assert.match(submissionApi, /apiKey:\s*getSupabasePublishableKey\(\)/);
  } finally {
    if (originalPublishable === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = originalPublishable;
    if (originalAnon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalAnon;
  }
});

test('challenge downloads use short-lived signed links and local browser blobs', async () => {
  const [downloadApi, modalClient] = await Promise.all([
    readFile(new URL('../api/asset-download.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/modals.js', import.meta.url), 'utf8')
  ]);

  assert.match(downloadApi, /createSignedUrl\(path, 5 \* 60/);
  assert.doesNotMatch(downloadApi, /createSignedUrl\(path, 15 \* 60/);
  assert.doesNotMatch(downloadApi, /has not been uploaded to challenge-assets/);
  assert.match(modalClient, /fetch\(result\.url/);
  assert.match(modalClient, /URL\.createObjectURL\(fileBlob\)/);
  assert.match(modalClient, /link\.download = result\.filename \|\| filename/);
});
