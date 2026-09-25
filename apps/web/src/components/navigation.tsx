'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function Navigation() {
  const path = usePathname();
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
      <Link className="header-cta" href="/auth/sign-in">
        Sign in <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
