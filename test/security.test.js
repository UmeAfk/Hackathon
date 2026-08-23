import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rateLimitResponse } from '../api/_lib/rate-limit.js';

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
});
