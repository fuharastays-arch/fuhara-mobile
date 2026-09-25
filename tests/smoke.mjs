import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
for (const [path, phrase] of [
  ['/', 'Verified stays. Effortless comfort.'],
  ['/properties?destination=Abuja', 'A stay in Abuja.'],
  ['/host', 'Open your doors'],
  ['/auth/sign-in', 'Good to have you back.'],
  ['/auth/sign-up', 'Your next chapter starts here.'],
  ['/auth/forgot-password', 'A fresh start.'],
]) {
  test(`public route ${path}`, async () => {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(phrase));
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });
}
for (const path of [
  '/account',
  '/account/profile',
  '/host/onboarding',
  '/auth/reset-password',
]) {
  test(`anonymous requests cannot open ${path}`, async () => {
    const response = await fetch(new URL(path, base), { redirect: 'manual' });
    assert.equal(response.status, 307);
    assert.match(response.headers.get('location'), /^\/auth\/sign-in/);
    assert.match(response.headers.get('cache-control'), /no-store/);
  });
}
test('catalog detail remains closed without a public data contract', async () => {
  const response = await fetch(
    new URL('/properties/c3b2fd12-ceda-4f5e-8c83-1f72f5041523', base),
  );
  assert.equal(response.status, 404);
});
test('unrecognized auth actions are not routed to a form', async () => {
  const response = await fetch(new URL('/auth/admin', base));
  assert.equal(response.status, 404);
});
test('callback without code never follows external next URLs', async () => {
  const response = await fetch(
    new URL('/auth/callback?next=https://evil.test', base),
    { redirect: 'manual' },
  );
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get('location'));
  assert.equal(location.origin, new URL(base).origin);
  assert.equal(location.pathname, '/auth/sign-in');
});
test('search content is escaped in server HTML', async () => {
  const response = await fetch(
    new URL(
      '/properties?destination=' +
        encodeURIComponent('<script>alert(1)</script>'),
      base,
    ),
  );
  const html = await response.text();
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.ok(html.includes('&lt;script&gt;'));
});
