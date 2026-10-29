import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { parseCredentials } from '@fuhara/core';
import { Button, Field, FormScreen, Notice, Subtitle, Title } from './ui';
import { supabase } from '../lib/supabase';
import { errorMessage } from '../lib/errors';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { favorite } = useLocalSearchParams<{ favorite?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = parseCredentials(email, password, mode === 'sign-up');
    if (!parsed.ok) return setMessage(parsed.message);
    setBusy(true);
    setMessage('');
    try {
      const result =
        mode === 'sign-in'
          ? await supabase.auth.signInWithPassword(parsed.data)
          : await supabase.auth.signUp(parsed.data);
      if (result.error) throw result.error;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (mode === 'sign-up' && !result.data.session) {
        setMessage('Check your email to confirm the account, then sign in.');
      } else {
        if (favorite) {
          router.replace({
            pathname: '/properties/[id]',
            params: { id: favorite, save: '1' },
          });
        } else {
          router.replace('/(tabs)/account');
        }
      }
    } catch (error) {
      setMessage(errorMessage(error, 'Authentication could not be completed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <Title>
        {mode === 'sign-in' ? 'Welcome back.' : 'Create your Fuhara account.'}
      </Title>
      <Subtitle>One account for Abuja stays and hosting.</Subtitle>
      {message ? (
        <Notice tone={message.startsWith('Check') ? 'success' : 'error'}>
          {message}
        </Notice>
      ) : null}
      <Field
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        hint={mode === 'sign-up' ? 'Use 12–128 characters.' : undefined}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button
        label={
          busy
            ? 'Please wait…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'
        }
        onPress={submit}
        disabled={busy}
      />
      {mode === 'sign-in' ? (
        <>
          <Button
            kind="secondary"
            label="Forgot password"
            onPress={() => router.push('/auth/forgot-password')}
          />
          <Button
            kind="secondary"
            label="Create an account"
            onPress={() =>
              router.replace({
                pathname: '/auth/sign-up',
                params: favorite ? { favorite } : {},
              })
            }
          />
        </>
      ) : (
        <Button
          kind="secondary"
          label="I already have an account"
          onPress={() =>
            router.replace({
              pathname: '/auth/sign-in',
              params: favorite ? { favorite } : {},
            })
          }
        />
      )}
    </FormScreen>
  );
}
