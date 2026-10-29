import { useState } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Field,
  FormScreen,
  Notice,
  Subtitle,
  Title,
} from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { errorMessage } from '../../lib/errors';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (password.length < 12 || password.length > 128)
      return setMessage('Use a password between 12 and 128 characters.');
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/(tabs)/account');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormScreen>
      <Title>Choose a new password.</Title>
      <Subtitle>Use at least 12 characters.</Subtitle>
      {message ? <Notice tone="error">{message}</Notice> : null}
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <Button
        label={busy ? 'Saving…' : 'Update password'}
        onPress={submit}
        disabled={busy}
      />
    </FormScreen>
  );
}
