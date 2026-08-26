import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emailPreviewMessages } from './_lib/email-preview-messages.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'tmp', 'email-previews');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

const temporaryRoot = `${path.join(projectRoot, 'tmp')}${path.sep}`;
if (!outputDirectory.startsWith(temporaryRoot)) throw new Error('Email preview output must stay inside the workspace tmp directory.');
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const previews = emailPreviewMessages();

for (const preview of previews) {
  await writeFile(path.join(outputDirectory, `${preview.slug}.html`), preview.message.html, 'utf8');
}

const cards = previews.map(preview => `<article>
  <div class="meta"><strong>${escapeHtml(preview.label)}</strong><span>${escapeHtml(preview.message.subject)}</span></div>
  <iframe title="${escapeHtml(preview.label)}" src="./${preview.slug}.html"></iframe>
</article>`).join('');

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entangle email previews</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f1e6d0;color:#211a12;font-family:Arial,Helvetica,sans-serif}header{padding:32px;max-width:1180px;margin:auto}h1{margin:0 0 8px;font-size:36px}p{margin:0;color:#4a4034}main{max-width:1180px;margin:auto;padding:0 32px 48px;display:grid;gap:28px}.meta{background:#efb13d;color:#211a12;border:3px solid #211a12;padding:14px 18px;display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap}.meta span{font-family:"Courier New",monospace;font-size:13px}article{background:#e6552e;padding:0 8px 8px}iframe{display:block;width:100%;height:860px;border:0;background:#f1e6d0}@media(max-width:700px){header,main{padding-left:14px;padding-right:14px}.meta{display:block}.meta span{display:block;margin-top:6px}iframe{height:760px}}
</style></head><body><header><h1>Entangle 2K26 email previews</h1><p>Local visual previews only. No emails are sent from this page.</p></header><main>${cards}</main></body></html>`;

await writeFile(path.join(outputDirectory, 'index.html'), gallery, 'utf8');
console.log(`Generated ${previews.length} email previews.`);
console.log(`Open: http://127.0.0.1:3000/tmp/email-previews/`);
