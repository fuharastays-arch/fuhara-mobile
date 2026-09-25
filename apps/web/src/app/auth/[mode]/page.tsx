import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthForm, ResetForm } from '@/components/forms';
import { publicEnv } from '@/lib/env';
import { identity } from '@/lib/account';
import { safeNext } from '@fuhara/core';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Your Fuhara account',
  robots: { index: false, follow: false },
};
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ next?: string; error?: string; updated?: string }>;
}) {
  const { mode } = await params;
  const query = await searchParams;
  if (
    !['sign-in', 'sign-up', 'forgot-password', 'reset-password'].includes(mode)
  )
    notFound();
  if (mode === 'reset-password') {
    if (!publicEnv()) notFound();
    await identity();
  }
  const title =
    mode === 'sign-in'
      ? 'Good to have you back.'
      : mode === 'sign-up'
        ? 'Your next chapter starts here.'
        : mode === 'forgot-password'
          ? 'A fresh start.'
          : 'Make it yours again.';
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <p className="eyebrow">FEEL AT HOME, AWAY.</p>
        <h2>
          A place to arrive.
          <br />
          <em>A feeling to keep.</em>
        </h2>
        <p>Verified stays. Effortless comfort.</p>
      </aside>
      <section className="auth-content">
        <p className="eyebrow">YOUR FUHARA ACCOUNT</p>
        <h1>{title}</h1>
        <p className="muted">
          {mode === 'sign-up'
            ? 'One account for your stays and your hosting journey.'
            : mode.includes('password')
              ? 'Let’s get you back to feeling at home.'
              : 'Sign in to your guest or host account.'}
        </p>
        {query.error && (
          <p className="notice">
            This confirmation link could not be completed. It may have expired
            or been opened in another browser. Try signing in or requesting a
            fresh password reset.
          </p>
        )}
        {query.updated && (
          <p className="notice">
            Your password has been updated. Please sign in.
          </p>
        )}
        {mode === 'reset-password' ? (
          <ResetForm />
        ) : (
          <AuthForm
            mode={mode as 'sign-in' | 'sign-up' | 'forgot-password'}
            next={safeNext(query.next)}
            configured={!!publicEnv()}
          />
        )}
        <p className="auth-switch">
          {mode === 'sign-in' ? (
            <>
              New to Fuhara?{' '}
              <Link
                href={`/auth/sign-up?next=${encodeURIComponent(safeNext(query.next))}`}
              >
                Create an account
              </Link>
            </>
          ) : (
            <Link href="/auth/sign-in">Back to sign in</Link>
          )}
        </p>
      </section>
    </div>
  );
}
