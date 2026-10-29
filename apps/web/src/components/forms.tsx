'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import {
  authenticate,
  saveProfile,
  resetPassword,
  type FormState,
} from '@/lib/actions';
import type { Profile } from '@fuhara/core';
const initial: FormState = { message: '' };
export function AuthForm({
  mode,
  next,
  configured,
}: {
  mode: 'sign-in' | 'sign-up' | 'forgot-password';
  next: string;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate, initial);
  return (
    <form action={action} className="form">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
        />
      </label>
      {mode !== 'forgot-password' && (
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={
              mode === 'sign-up' ? 'new-password' : 'current-password'
            }
            required
            minLength={mode === 'sign-up' ? 12 : 1}
            maxLength={128}
          />
          {mode === 'sign-up' && <small>At least 12 characters.</small>}
        </label>
      )}
      {mode === 'sign-in' && (
        <Link className="text-link" href="/auth/forgot-password">
          Forgot password?
        </Link>
      )}
      {!configured && (
        <p className="notice">
          Sign-in is not available yet. Please check back soon.
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className={state.success ? 'notice' : 'form-error'}
      >
        {state.message}
      </p>
      <button className="button" disabled={pending || !configured}>
        {pending
          ? 'Please wait…'
          : mode === 'sign-in'
            ? 'Welcome back'
            : mode === 'sign-up'
              ? 'Create your account'
              : 'Send reset link'}
      </button>
    </form>
  );
}
export function ProfileForm({
  profile,
  email,
  disabled = false,
}: {
  profile: Profile | null;
  email: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(saveProfile, initial);
  return (
    <form action={action} className="form">
      <div className="form-pair">
        <label>
          First name
          <input
            name="first_name"
            autoComplete="given-name"
            defaultValue={profile?.first_name}
            maxLength={80}
            required
            disabled={disabled}
          />
        </label>
        <label>
          Last name
          <input
            name="last_name"
            autoComplete="family-name"
            defaultValue={profile?.last_name}
            maxLength={80}
            required
            disabled={disabled}
          />
        </label>
      </div>
      <label>
        Email address
        <input value={email} type="email" readOnly />
        <small>Your verified sign-in email.</small>
      </label>
      <label>
        Phone number <span className="muted">(optional)</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={profile?.phone ?? ''}
          maxLength={30}
          disabled={disabled}
        />
      </label>
      <p role="status" className="form-error">
        {state.message}
      </p>
      <button className="button" disabled={pending || disabled}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
export function ResetForm() {
  const [state, action, pending] = useActionState(resetPassword, initial);
  return (
    <form className="form" action={action}>
      <label>
        New password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
      <p role="status" className="form-error">
        {state.message}
      </p>
      <button className="button" disabled={pending}>
        {pending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
