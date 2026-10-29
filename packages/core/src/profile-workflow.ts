import type { Account, Profile, Result } from './index.ts';
type Failure = { code?: string } | null;
export interface ProfileStore {
  save(
    fields: Pick<
      Profile,
      'id' | 'first_name' | 'last_name' | 'email' | 'phone'
    >,
    existing: boolean,
  ): Promise<Failure>;
  createAccount(
    fields: Pick<Account, 'user_id' | 'status' | 'is_host'>,
  ): Promise<Failure>;
}
// This boundary is usable by web or native adapters. It never promotes a host
// or resets existing account controls, including after partial failure/retry.
export async function persistConsumerProfile(
  store: ProfileStore,
  input: {
    id: string;
    email: string;
    emailConfirmed: boolean;
    existingProfile: boolean;
    account: Account | null;
    first_name: string;
    last_name: string;
    phone: string | null;
  },
): Promise<Result<true>> {
  if (input.account && input.account.status !== 'active')
    return {
      ok: false,
      message: 'Your account is not active. Profile changes are unavailable.',
    };
  if (!input.emailConfirmed)
    return {
      ok: false,
      message: 'Confirm your email before saving your profile.',
    };
  const error = await store.save(
    {
      id: input.id,
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
    },
    input.existingProfile,
  );
  if (error)
    return {
      ok: false,
      message: 'Your profile could not be saved. Please try again.',
    };
  if (!input.account) {
    const created = await store.createAccount({
      user_id: input.id,
      status: 'active',
      is_host: false,
    });
    if (created && created.code !== '23505')
      return {
        ok: false,
        message:
          'Your profile was saved, but account setup needs another attempt. Please save again.',
      };
  }
  return { ok: true, data: true };
}
