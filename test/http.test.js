import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, normalizeEmail, normalizePhone, validEmail, validPhone } from '../api/_lib/http.js';

test('registration identity fields are normalized before storage', () => {
  assert.equal(cleanText('  Ada   Lovelace  ', 120), 'Ada Lovelace');
  assert.equal(normalizeEmail('  ADA@Example.COM  '), 'ada@example.com');
  assert.equal(normalizePhone('+91 98765-43210'), '+919876543210');
  assert.equal(normalizePhone('09876543210'), '+919876543210');
  assert.equal(normalizePhone('9876543210'), '+919876543210');
});

test('email and phone validation reject unusable contact values', () => {
  assert.equal(validEmail('ada@example.com'), true);
  assert.equal(validEmail('ada@example'), false);
  assert.equal(validEmail('ada..test@example.com'), false);
  assert.equal(validEmail('ada@-example.com'), false);
  assert.equal(validPhone('+919876543210'), true);
  assert.equal(validPhone('+911234567890'), false);
  assert.equal(validPhone('+912145876598'), false);
  assert.equal(validPhone('9876543210'), false);
});
