import test from 'node:test';
import assert from 'node:assert/strict';
import { eventState, getEventConfig, windowOverrideEnabled } from '../api/_lib/event.js';
import {
  challengeLaunchBroadcast,
  evaluationUpdateBroadcast,
  notSelectedEmail,
  registrationEmail,
  shortlistedEmail,
  submissionReceiptEmail
} from '../api/_lib/email-templates.js';

test('default event timeline moves through every public state', () => {
  assert.equal(eventState(new Date('2026-08-31T06:28:59Z')), 'upcoming');
  assert.equal(eventState(new Date('2026-08-31T06:29:00Z')), 'registration');
  assert.equal(eventState(new Date('2026-09-04T06:29:00Z')), 'live');
  assert.equal(eventState(new Date('2026-09-09T06:29:00Z')), 'closed');
});

test('event configuration uses explicit ISO dates and a five GiB upload ceiling', () => {
  const config = getEventConfig();
  assert.equal(config.maxUploadBytes, 5 * 1024 * 1024 * 1024);
  assert.equal(new Date(config.registrationOpensAt).toISOString(), '2026-08-31T06:29:00.000Z');
  assert.equal(new Date(config.taskDropsAt).toISOString(), '2026-09-04T06:29:00.000Z');
  assert.equal(new Date(config.submissionDeadlineAt).toISOString(), '2026-09-09T06:29:00.000Z');
});

test('event-window overrides are limited to local Vercel development', () => {
  const previous = process.env.VERCEL_ENV;
  const previousPreviewMode = process.env.ENTANGLE_PREVIEW_TEST_MODE;
  process.env.VERCEL_ENV = 'preview';
  assert.equal(windowOverrideEnabled({ headers: { host: 'localhost:3000' } }), false);
  process.env.ENTANGLE_PREVIEW_TEST_MODE = 'true';
  assert.equal(windowOverrideEnabled({ headers: { host: 'preview.example.vercel.app' } }), true);
  process.env.VERCEL_ENV = 'production';
  assert.equal(windowOverrideEnabled({ headers: { host: 'localhost:3000' } }), false);
  process.env.VERCEL_ENV = 'development';
  assert.equal(windowOverrideEnabled({ headers: { host: 'example.com' } }), true);
  delete process.env.VERCEL_ENV;
  assert.equal(windowOverrideEnabled({ headers: { host: 'localhost:3000' } }), true);
  assert.equal(windowOverrideEnabled({ headers: { host: 'example.com' } }), false);
  if (previous === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previous;
  if (previousPreviewMode === undefined) delete process.env.ENTANGLE_PREVIEW_TEST_MODE;
  else process.env.ENTANGLE_PREVIEW_TEST_MODE = previousPreviewMode;
});

test('transactional email templates escape participant and file content', () => {
  const participant = { name: '<img src=x onerror=alert(1)>', email: 'safe@example.com' };
  const registration = registrationEmail(participant, 'a'.repeat(43));
  const receipt = submissionReceiptEmail(participant, { id: 'receipt-1', original_filename: '<script>alert(1)</script>.zip' });
  assert.doesNotMatch(registration.html, /<img src=x/);
  assert.match(registration.html, /&lt;img/);
  assert.doesNotMatch(receipt.html, /<script>/);
  assert.match(receipt.html, /&lt;script&gt;/);
  assert.match(registration.text, /4 September at 11:59 AM IST/);
  assert.doesNotMatch(registration.text, /private challenge|Submission deadline/);
  assert.match(receipt.text, /ready for evaluation/);
  assert.doesNotMatch(receipt.text, /receipt|Receipt ID/);
});

test('the complete participant email set renders shared branded HTML', () => {
  const participant = { name: 'Aarav Sharma', email: 'aarav@example.com' };
  const messages = [
    challengeLaunchBroadcast(),
    evaluationUpdateBroadcast(),
    shortlistedEmail(participant, { venue: '<script>bad</script>', venueUrl: 'https://maps.example/test' }),
    notSelectedEmail(participant)
  ];
  for (const message of messages) {
    assert.match(message.html, /\[ ENTANGLE 2K26 \]/);
    assert.ok(message.subject);
  }
  assert.match(messages[0].html, /Unreal Engine 5/);
  assert.match(messages[0].html, /9 September 2026.*at 11:59 am/);
  assert.match(messages[0].html, />09<\/td>/);
  assert.match(messages[0].html, /@media only screen and \(max-width:600px\)/);
  assert.doesNotMatch(messages[0].html, /Button not working|RESEND_UNSUBSCRIBE_URL/);
  assert.doesNotMatch(messages[1].html, /Button not working|RESEND_UNSUBSCRIBE_URL/);
  assert.match(messages[1].html, /Keep an eye on your inbox\.<\/p>/);
  assert.doesNotMatch(messages[1].html, /next Entangle update/);
  assert.match(messages[0].html, /Visit Website/);
  assert.doesNotMatch(messages[2].html, /<script>bad<\/script>/);
  assert.match(messages[2].html, /aria-label="Presentation"/);
  assert.match(messages[2].html, /aria-label="Location"/);
  assert.match(messages[2].html, /https:\/\/maps\.example\/test/);
  assert.doesNotMatch(messages[2].html, /Presentation duration|Confirm by/);
  assert.match(submissionReceiptEmail(participant, { original_filename: 'Aarav.zip' }).html, /aria-label="Upload"/);
  assert.match(messages[3].html, /not selected to advance/);
});

test('event schedule can be extended through environment configuration', () => {
  const previousDeadline = process.env.ENTANGLE_SUBMISSION_DEADLINE_AT;
  process.env.ENTANGLE_SUBMISSION_DEADLINE_AT = '2026-09-11T11:59:00+05:30';
  assert.equal(getEventConfig().submissionDeadlineAt, '2026-09-11T11:59:00+05:30');
  if (previousDeadline === undefined) delete process.env.ENTANGLE_SUBMISSION_DEADLINE_AT;
  else process.env.ENTANGLE_SUBMISSION_DEADLINE_AT = previousDeadline;
});
