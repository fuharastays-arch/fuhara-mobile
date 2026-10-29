import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { brand } from '@fuhara/design';
import '@fuhara/design/tokens.css';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Fuhara — Feel at home, away.', template: '%s | Fuhara' },
  description: brand.motto,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation />
        <main id="main">{children}</main>
        <footer className="footer">
          <div>
            <Link href="/" className="footer-brand">
              fuhara<span>®</span>
            </Link>
            <p>{brand.motto}</p>
          </div>
          <div>
            <Link href="/properties">Explore stays</Link>
            <Link href="/host">Host with Fuhara</Link>
            <Link href="/account">Your account</Link>
          </div>
          <small>
            © {new Date().getFullYear()} Fuhara. A little closer to home.
          </small>
        </footer>
      </body>
    </html>
  );
}
