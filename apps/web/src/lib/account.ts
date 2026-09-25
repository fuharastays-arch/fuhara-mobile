import 'server-only';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import type { Account, Profile, HostProfile } from '@fuhara/core';
export async function identity(next = '/account') {
  const client = await serverClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return { client, user };
}
export async function accountContext(next = '/account') {
  const { client, user } = await identity(next);
  const [profile, account, host] = await Promise.all([
    client
      .from('profiles')
      .select('id,first_name,last_name,email,phone,avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
    client
      .from('user_accounts')
      .select('user_id,status,is_host')
      .eq('user_id', user.id)
      .maybeSingle(),
    client
      .from('host_profiles')
      .select('user_id,kyc_status,submitted_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  if (profile.error || account.error || host.error)
    throw new Error('Your account could not be loaded. Please try again.');
  return {
    client,
    user,
    profile: profile.data as Profile | null,
    account: account.data as Account | null,
    host: host.data as HostProfile | null,
  };
}
