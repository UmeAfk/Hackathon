import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function plainText(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalized(value) {
  return plainText(value).toLocaleLowerCase('en-IN');
}

function assertUnique(items, label) {
  const normalizedItems = items.map(normalized);
  assert.equal(new Set(normalizedItems).size, normalizedItems.length, `${label} must not contain duplicate entries`);
}

test('FAQ questions and legal section titles are unique and separated by purpose', async () => {
  const [home, terms, privacy] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../terms.html', import.meta.url), 'utf8'),
    readFile(new URL('../privacy.html', import.meta.url), 'utf8')
  ]);

  const faqQuestions = [...home.matchAll(/class="acc-trigger"[\s\S]*?<span>([\s\S]*?)<\/span>/g)].map((match) => match[1]);
  const termsHeadings = [...terms.matchAll(/<section class="legal-section[^>]*>[\s\S]*?<h2>([\s\S]*?)<\/h2>/g)].map((match) => match[1]);
  const privacyHeadings = [...privacy.matchAll(/<section class="legal-section[^>]*>[\s\S]*?<h2>([\s\S]*?)<\/h2>/g)].map((match) => match[1]);

  assert.equal(faqQuestions.length, 10, 'the operational FAQ should contain ten focused questions');
  assert.ok(faqQuestions.every((question) => plainText(question).endsWith('?')), 'every FAQ title should be a question');
  assert.equal(termsHeadings.length, 8, 'terms should contain eight distinct participation topics');
  assert.equal(privacyHeadings.length, 8, 'privacy policy should contain eight distinct data topics');

  assertUnique(faqQuestions, 'FAQ');
  assertUnique(termsHeadings, 'Terms');
  assertUnique(privacyHeadings, 'Privacy policy');
  assertUnique([...termsHeadings, ...privacyHeadings], 'Legal pages');
});

test('the main page exposes legal links in the footer and registration consent', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((home.match(/href="terms\.html"/g) || []).length, 2);
  assert.equal((home.match(/href="privacy\.html"/g) || []).length, 2);
});

test('every public footer uses the requested three-column attribution', async () => {
  const pages = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../terms.html', import.meta.url), 'utf8'),
    readFile(new URL('../privacy.html', import.meta.url), 'utf8')
  ]);

  for (const page of pages) {
    assert.match(page, /class="legal-credit">Made with 💙 by <a href="https:\/\/venusapp\.in\/"[\s\S]*?>Veil<\/a>/);
    assert.match(page, /class="legal-copyright">© 2026 Vastuchitra interactive • Entangle 2K26<\/p>/);
    assert.doesNotMatch(page, /Veil \(venusapp\.in\)/);
    assert.doesNotMatch(page, /legal-bar-right/);
  }
});

test('the production page exposes a complete social sharing preview', async () => {
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(home, /<meta property="og:title" content="Entangle 2K26/);
  assert.match(home, /<meta property="og:description" content="[^"]+">/);
  assert.match(home, /<meta property="og:image" content="https:\/\/entangle2k26\.vercel\.app\/public\/logo\.png">/);
  assert.match(home, /<meta property="og:image:width" content="7991">/);
  assert.match(home, /<meta property="og:image:height" content="2304">/);
  assert.match(home, /<meta name="twitter:card" content="summary_large_image">/);
});

test('the site consistently describes interactivity and walkthroughs as optional', async () => {
  const [home, templates] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../api/_lib/email-templates.js', import.meta.url), 'utf8')
  ]);

  assert.match(home, /Interactivity and walkthroughs are optional/);
  assert.match(home, /Optional MP4 walkthrough or cinematic/);
  assert.doesNotMatch(home, /Include at least one simple interaction/);
  assert.match(templates, /Interactivity is optional/);
});

test('registration links the legal documents and states the below-30 limit', async () => {
  const [home, terms, privacy] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../terms.html', import.meta.url), 'utf8'),
    readFile(new URL('../privacy.html', import.meta.url), 'utf8')
  ]);

  assert.match(home, /confirm that I am below 30 years old/);
  assert.match(home, /I accept the <a href="terms\.html"[\s\S]*?Terms &amp;[\s\S]*?<a href="privacy\.html"/);
  assert.match(terms, /must be below 30 years old when you register/);
  assert.doesNotMatch(privacy, /Supabase|Resend|Vercel/i);
});
