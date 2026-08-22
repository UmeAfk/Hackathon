import test from 'node:test';
import assert from 'node:assert/strict';
import { eventState, getEventConfig } from '../api/_lib/event.js';
import { registrationEmail, submissionReceiptEmail } from '../api/_lib/email-templates.js';

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

test('transactional email templates escape participant and file content', () => {
  const participant = { name: '<img src=x onerror=alert(1)>', email: 'safe@example.com' };
  const registration = registrationEmail(participant, 'a'.repeat(43));
  const receipt = submissionReceiptEmail(participant, { id: 'receipt-1', original_filename: '<script>alert(1)</script>.zip' });
  assert.doesNotMatch(registration.html, /<img src=x/);
  assert.match(registration.html, /&lt;img/);
  assert.doesNotMatch(receipt.html, /<script>/);
  assert.match(receipt.html, /&lt;script&gt;/);
});
