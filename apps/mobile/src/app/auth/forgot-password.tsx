import { useState } from 'react';
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: 'fuhara://auth/reset-password' },
      );
      if (error) throw error;
      setMessage('If that address exists, a reset link is on its way.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormScreen>
      <Title>Reset your password.</Title>
      <Subtitle>We’ll send a secure recovery link to your email.</Subtitle>
      {message ? <Notice>{message}</Notice> : null}
      <Field
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        label={busy ? 'Sending…' : 'Send reset link'}
        onPress={submit}
        disabled={busy || !email.includes('@')}
      />
    </FormScreen>
  );
}
