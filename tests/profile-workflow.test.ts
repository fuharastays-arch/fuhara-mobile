import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  persistConsumerProfile,
  type ProfileStore,
} from '../packages/core/src/profile-workflow.ts';
const input = {
  id: 'guest',
  email: 'guest@example.test',
  emailConfirmed: true,
  existingProfile: false,
  account: null,
  first_name: 'Ada',
  last_name: 'Obi',
  phone: null,
};
function fixture(
  profileError: { code: string } | null = null,
  accountError: { code: string } | null = null,
) {
  const calls: unknown[] = [];
  const store: ProfileStore = {
    async save(fields, existing) {
      calls.push({ fields, existing });
      return profileError;
    },
    async createAccount(fields) {
      calls.push(fields);
      return accountError;
    },
  };
  return { store, calls };
}
test('new consumer creates profile then only a non-host active account', async () => {
  const { store, calls } = fixture();
  assert.equal((await persistConsumerProfile(store, input)).ok, true);
  assert.deepEqual(calls[1], {
    user_id: 'guest',
    status: 'active',
    is_host: false,
  });
  assert.equal(calls.length, 2);
});
test('suspended and disabled accounts cannot write any profile fields', async () => {
  for (const status of ['suspended', 'disabled'] as const) {
    const { store, calls } = fixture();
    assert.equal(
      (
        await persistConsumerProfile(store, {
          ...input,
          account: { user_id: 'guest', is_host: true, status },
        })
      ).ok,
      false,
    );
    assert.equal(calls.length, 0);
  }
});
test('unconfirmed identity cannot provision a consumer account', async () => {
  const { store, calls } = fixture();
  assert.equal(
    (await persistConsumerProfile(store, { ...input, emailConfirmed: false }))
      .ok,
    false,
  );
  assert.equal(calls.length, 0);
});
test('failed profile save never creates an orphan account', async () => {
  const { store, calls } = fixture({ code: '42501' });
  assert.equal((await persistConsumerProfile(store, input)).ok, false);
  assert.equal(calls.length, 1);
});
test('partial account failure gives a retryable result', async () => {
  const { store } = fixture(null, { code: '42501' });
  const result = await persistConsumerProfile(store, input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /save again/);
});
test('retry updates saved profile and tolerates concurrent initial account creation', async () => {
  const { store, calls } = fixture(null, { code: '23505' });
  assert.equal(
    (await persistConsumerProfile(store, { ...input, existingProfile: true }))
      .ok,
    true,
  );
  assert.equal((calls[0] as { existing: boolean }).existing, true);
});
test('existing verified host account controls are never overwritten', async () => {
  const { store, calls } = fixture();
  assert.equal(
    (
      await persistConsumerProfile(store, {
        ...input,
        existingProfile: true,
        account: { user_id: 'guest', is_host: true, status: 'active' },
      })
    ).ok,
    true,
  );
  assert.equal(calls.length, 1);
});
