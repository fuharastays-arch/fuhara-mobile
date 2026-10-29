import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeNext,
  parseCredentials,
  parseProfile,
  hostAccess,
  isPropertyId,
  discoveryQuery,
} from '../packages/core/src/index.ts';
test('redirects allow only internal product destinations', () => {
  for (const candidate of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2f%2fevil.test',
    '/account?next=https://evil.test',
    '/auth/reset-password',
    null,
    123,
  ])
    assert.equal(safeNext(candidate), '/account');
  assert.equal(safeNext('/host/onboarding'), '/host/onboarding');
  assert.equal(safeNext('/account/profile'), '/account/profile');
});
test('credentials reject malformed email and short signup passwords', () => {
  assert.equal(parseCredentials('bad', 'long enough password', true).ok, false);
  assert.equal(parseCredentials('a@example.com', 'short', true).ok, false);
  assert.equal(
    parseCredentials('a@example.com', 'x'.repeat(129), true).ok,
    false,
  );
  assert.deepEqual(
    parseCredentials(' A@Example.COM ', 'twelve characters!', true),
    {
      ok: true,
      data: { email: 'a@example.com', password: 'twelve characters!' },
    },
  );
});
test('sign-in accepts existing passwords without relaxing signup', () => {
  assert.equal(parseCredentials('a@example.com', 'oldpass').ok, true);
  assert.equal(parseCredentials('a@example.com', 'oldpass', true).ok, false);
});
test('profiles validate names and optional phone without role fields', () => {
  assert.equal(parseProfile(' ', 'Name', '').ok, false);
  assert.equal(parseProfile('a'.repeat(81), 'Name', '').ok, false);
  assert.equal(parseProfile('Ada', 'Obi', 'abc').ok, false);
  assert.deepEqual(parseProfile(' Ada ', ' Obi ', ''), {
    ok: true,
    data: { first_name: 'Ada', last_name: 'Obi', phone: null },
  });
});
test('host eligibility requires live active account, host flag and verified KYC', () => {
  const account = { user_id: 'one', status: 'active' as const, is_host: true };
  const host = {
    user_id: 'one',
    kyc_status: 'verified' as const,
    submitted_at: null,
  };
  assert.equal(hostAccess(account, host), true);
  assert.equal(hostAccess({ ...account, is_host: false }, host), false);
  assert.equal(hostAccess({ ...account, status: 'suspended' }, host), false);
  assert.equal(hostAccess({ ...account, status: 'disabled' }, host), false);
  assert.equal(hostAccess(account, { ...host, kyc_status: 'pending' }), false);
  assert.equal(hostAccess(account, null), false);
  assert.equal(hostAccess(null, host), false);
});
test('route inputs reject invalid identifiers and bound search strings', () => {
  assert.equal(isPropertyId('c3b2fd12-ceda-4f5e-8c83-1f72f5041523'), true);
  assert.equal(isPropertyId('demo-villa'), false);
  assert.equal(isPropertyId('../account'), false);
  assert.equal(discoveryQuery(['Abuja']), '');
  assert.equal(discoveryQuery('x'.repeat(100)).length, 80);
});
