import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiModules = new Map([
  ['/api/register', '../api/register.js'],
  ['/api/participant', '../api/participant.js'],
  ['/api/event-config', '../api/event-config.js'],
  ['/api/brief', '../api/brief.js'],
  ['/api/asset-download', '../api/asset-download.js'],
  ['/api/submission', '../api/submission.js'],
  ['/api/submission-complete', '../api/submission-complete.js']
]);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2']
]);

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed.at(-1) && ['"', "'"].includes(trimmed[0])) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function loadLocalEnvironment() {
  try {
    const source = await readFile(path.join(projectRoot, '.env.local'), 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = unquote(match[2]);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function attachVercelResponseHelpers(response) {
  response.status = statusCode => {
    response.statusCode = statusCode;
    return response;
  };
  response.json = body => {
    if (!response.hasHeader('Content-Type')) response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(body));
    return response;
  };
}

async function parseBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > 1024 * 1024) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function serveApi(request, response, pathname) {
  const modulePath = apiModules.get(pathname);
  if (!modulePath) return false;
  attachVercelResponseHelpers(response);
  try {
    request.body = await parseBody(request);
    const module = await import(modulePath);
    await module.default(request, response);
  } catch (error) {
    if (response.writableEnded) return true;
    const tooLarge = error.message === 'REQUEST_TOO_LARGE';
    response.status(tooLarge ? 413 : 500).json({
      error: tooLarge ? 'Request body is too large.' : 'Local API request failed.'
    });
    if (!tooLarge) console.error('Local API error:', error.message);
  }
  return true;
}

async function serveStatic(request, response, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const segments = relativePath.split(/[\\/]/);
  if (segments.some(segment => segment.startsWith('.'))) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const filePath = path.resolve(projectRoot, relativePath);
  const allowedRoot = `${projectRoot.toLowerCase()}${path.sep}`;
  if (!filePath.toLowerCase().startsWith(allowedRoot)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500);
    response.end(error.code === 'ENOENT' ? 'Not found' : 'Local server error');
  }
}

await loadLocalEnvironment();

const listenPort = Number.parseInt(process.env.ENTANGLE_DEV_PORT || '3000', 10);
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  if (await serveApi(request, response, url.pathname)) return;
  await serveStatic(request, response, url.pathname);
});

server.listen(listenPort, '127.0.0.1', () => {
  const supabaseReady = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  const resendReady = Boolean(process.env.RESEND_API_KEY);
  console.log(`Entangle local server: http://127.0.0.1:${listenPort}`);
  console.log(`Supabase: ${supabaseReady ? 'configured' : 'not configured'} · Resend: ${resendReady ? 'configured' : 'skipped'}`);
});
