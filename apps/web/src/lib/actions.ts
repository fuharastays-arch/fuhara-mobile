'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { serverClient } from '@/lib/supabase/server';
import { publicEnv, appOrigin } from '@/lib/env';
import { accountContext, identity } from '@/lib/account';
import { parseCredentials, parseProfile, safeNext } from '@fuhara/core';
import { persistConsumerProfile } from '@fuhara/core/profile-workflow';
export type FormState = { message: string; success?: boolean };
export async function authenticate(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  if (!publicEnv())
    return { message: 'Sign-in is not available yet. Please try again later.' };
  const mode = form.get('mode');
  if (!['sign-in', 'sign-up', 'forgot-password'].includes(String(mode)))
    return { message: 'Invalid request.' };
  const parsed = parseCredentials(
    form.get('email'),
    mode === 'forgot-password' ? 'unused' : form.get('password'),
    mode === 'sign-up',
  );
  if (!parsed.ok) return { message: parsed.message };
  const client = await serverClient();
  const next = safeNext(form.get('next'));
  if (mode === 'forgot-password') {
    await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appOrigin()}/auth/callback?next=/auth/reset-password`,
    });
    return {
      success: true,
      message:
        'If this email can receive a reset link, it will arrive shortly. Open it in this browser.',
    };
  }
  if (mode === 'sign-up') {
    const { error } = await client.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: `${appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error)
      return {
        message:
          'We could not create your account. Please try again later or sign in.',
      };
    return {
      success: true,
      message:
        'Check your email to confirm your account in this browser, then sign in. If you already have an account, sign in instead.',
    };
  }
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error)
    return { message: 'Sign-in failed. Check your details and try again.' };
  redirect(next);
}
export async function saveProfile(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseProfile(
    form.get('first_name'),
    form.get('last_name'),
    form.get('phone'),
  );
  if (!parsed.ok) return { message: parsed.message };
  const { client, user, profile, account } = await accountContext();
  const saved = await persistConsumerProfile(
    {
      async save(fields, existing) {
        const { id, ...editable } = fields;
        const result = existing
          ? await client.from('profiles').update(editable).eq('id', id)
          : await client.from('profiles').insert(fields);
        return result.error;
      },
      async createAccount(fields) {
        const result = await client.from('user_accounts').insert(fields);
        return result.error;
      },
    },
    {
      id: user.id,
      email: user.email ?? '',
      emailConfirmed: !!user.email && !!user.email_confirmed_at,
      existingProfile: !!profile,
      account,
      ...parsed.data,
    },
  );
  if (!saved.ok) return { message: saved.message };
  revalidatePath('/account');
  redirect('/account');
}
export async function resetPassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { client, user } = await identity();
  const parsed = parseCredentials(user.email, form.get('password'), true);
  if (!parsed.ok) return { message: parsed.message };
  if (form.get('password') !== form.get('confirm'))
    return { message: 'The passwords do not match.' };
  const { error } = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    return {
      message:
        'Your password could not be updated. Request a fresh reset link.',
    };
  await client.auth.signOut({ scope: 'local' });
  redirect('/auth/sign-in?updated=1');
}
export async function signOut() {
  const client = await serverClient();
  await client.auth.signOut({ scope: 'local' });
  redirect('/');
}
