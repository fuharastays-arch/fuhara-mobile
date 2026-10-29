import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicEnv, appOrigin } from '../apps/web/src/lib/env.ts';
function env(values: Record<string, string | undefined>, run: () => void) {
  const previous = { ...process.env };
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    process.env = previous;
  }
}
test('unconfigured local shell works without credentials', () =>
  env(
    {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
    },
    () => assert.equal(publicEnv(), null),
  ));
test('partial Supabase configuration fails clearly', () =>
  env(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
    },
    () => assert.throws(publicEnv, /both/),
  ));
test('public configuration rejects secret and service-role keys', () => {
  for (const key of [
    'sb_secret_do-not-use',
    `a.${btoa(JSON.stringify({ role: 'service_role' }))}.c`,
  ])
    env(
      {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      },
      () => assert.throws(publicEnv),
    );
});
test('legacy anon keys remain supported', () =>
  env(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `a.${btoa(JSON.stringify({ role: 'anon' }))}.c`,
    },
    () => assert.ok(publicEnv()),
  ));
test('non-local Supabase URLs require HTTPS', () =>
  env(
    {
      NEXT_PUBLIC_SUPABASE_URL: 'http://example.test',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    },
    () => assert.throws(publicEnv, /HTTPS/),
  ));
test('email callback origin rejects paths, credentials and insecure hosts', () => {
  for (const url of [
    'https://example.test/path',
    'https://user:pass@example.test',
    'http://example.test',
    'https://example.test?next=other',
    'https://example.test#other',
  ])
    env({ NEXT_PUBLIC_APP_URL: url }, () => assert.throws(appOrigin));
  env({ NEXT_PUBLIC_APP_URL: 'http://localhost:3001' }, () =>
    assert.equal(appOrigin(), 'http://localhost:3001'),
  );
  env({ NEXT_PUBLIC_APP_URL: 'https://stays.example.test' }, () =>
    assert.equal(appOrigin(), 'https://stays.example.test'),
  );
});
