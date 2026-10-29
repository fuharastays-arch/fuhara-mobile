'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import { publicEnv } from '@/lib/env';
export function Navigation() {
  const path = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!publicEnv()) {
      setSignedIn(false);
      return;
    }
    const client = browserClient();
    // INITIAL_SESSION resolves the pending state; later events also cover
    // sign-in, sign-out and refresh while this shared layout stays mounted.
    // Resubscribe after navigation to read cookies changed by server actions,
    // which do not emit browser-client auth events themselves.
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) =>
      setSignedIn(!!session?.user),
    );
    return () => subscription.unsubscribe();
  }, [path]);
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="Fuhara home">
        <img src="/wordmark-teal.svg" alt="Fuhara" width="126" height="38" />
      </Link>
      <nav aria-label="Main navigation">
        {[
          ['/properties', 'Find a stay'],
          ['/host', 'Become a host'],
          ['/account', 'My account'],
        ].map(([href, title]) => (
          <Link
            key={href}
            href={href}
            aria-current={path.startsWith(href) ? 'page' : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      <Link
        className="header-cta"
        href={signedIn === false ? '/auth/sign-in' : '/account'}
        aria-busy={signedIn === null}
      >
        {signedIn === false ? 'Sign in' : 'Account'}{' '}
        <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
