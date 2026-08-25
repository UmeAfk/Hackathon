import test from 'node:test';
import assert from 'node:assert/strict';
import { eventState, getEventConfig, windowOverrideEnabled } from '../api/_lib/event.js';
import { registrationEmail, submissionReceiptEmail, twoDayReminderBroadcast } from '../api/_lib/email-templates.js';

test('default event timeline moves through every public state', () => {
  assert.equal(eventState(new Date('2026-08-30T18:29:59Z')), 'upcoming');
  assert.equal(eventState(new Date('2026-08-30T18:30:00Z')), 'registration');
  assert.equal(eventState(new Date('2026-09-03T18:29:00Z')), 'live');
  assert.equal(eventState(new Date('2026-09-07T18:29:00Z')), 'closed');
});

test('event configuration uses explicit ISO dates and a five GiB upload ceiling', () => {
  const config = getEventConfig();
  assert.equal(config.maxUploadBytes, 5 * 1024 * 1024 * 1024);
  assert.equal(new Date(config.taskDropsAt).toISOString(), '2026-09-03T18:29:00.000Z');
  assert.equal(new Date(config.submissionDeadlineAt).toISOString(), '2026-09-07T18:29:00.000Z');
});

test('event-window overrides are limited to local Vercel development', () => {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'preview';
  assert.equal(windowOverrideEnabled({ headers: { host: 'localhost:3000' } }), false);
  process.env.VERCEL_ENV = 'production';
  assert.equal(windowOverrideEnabled({ headers: { host: 'localhost:3000' } }), false);
  process.env.VERCEL_ENV = 'development';
  assert.equal(windowOverrideEnabled({ headers: { host: 'example.com' } }), true);
  delete process.env.VERCEL_ENV;
  assert.equal(windowOverrideEnabled({ headers: { host: 'localhost:3000' } }), true);
  assert.equal(windowOverrideEnabled({ headers: { host: 'example.com' } }), false);
  if (previous === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previous;
});

test('transactional email templates escape participant and file content', () => {
  const participant = { name: '<img src=x onerror=alert(1)>', email: 'safe@example.com' };
  const registration = registrationEmail(participant, 'a'.repeat(43));
  const receipt = submissionReceiptEmail(participant, { id: 'receipt-1', original_filename: '<script>alert(1)</script>.zip' });
  assert.doesNotMatch(registration.html, /<img src=x/);
  assert.match(registration.html, /&lt;img/);
  assert.doesNotMatch(receipt.html, /<script>/);
  assert.match(receipt.html, /&lt;script&gt;/);
  assert.match(registration.text, /Task drops:/);
  assert.match(receipt.text, /Receipt ID:/);
});

test('two-day broadcast keeps personalization, secure links, and unsubscribe handling', () => {
  const reminder = twoDayReminderBroadcast();
  assert.match(reminder.html, /\{\{\{contact\.first_name\|there\}\}\}/);
  assert.match(reminder.html, /\{\{\{contact\.access_url\}\}\}/);
  assert.match(reminder.html, /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
  assert.match(reminder.text, /Two days remaining/);
});
