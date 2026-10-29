import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const React = require('react');
const jsx = require('react/jsx-runtime');
// Execute the actual component with controlled auth events and a minimal hook
// harness; browser checks cover React hydration and responsive presentation.
function navigation(configured = true) {
  let state: boolean | null = null;
  let mounted = false;
  let listener: (event: string, session: unknown) => void;
  let cleanup: (() => void) | undefined;
  let unsubscribed = false;
  const source = readFileSync(
    new URL('../apps/web/src/components/navigation.tsx', import.meta.url),
    'utf8',
  );
  const output = swc.transformSync(source, {
    filename: 'navigation.tsx',
    module: { type: 'commonjs' },
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      transform: { react: { runtime: 'automatic' } },
    },
  }).code;
  const exports: any = {};
  runInNewContext(output, {
    exports,
    require(name: string) {
      if (name === 'react/jsx-runtime') return jsx;
      if (name === 'react')
        return {
          ...React,
          useState: () => [
            state,
            (value: boolean) => {
              state = value;
            },
          ],
          useEffect: (effect: () => (() => void) | undefined) => {
            if (!mounted) {
              mounted = true;
              cleanup = effect();
            }
          },
        };
      if (name === 'next/link') return { default: 'a' };
      if (name === 'next/navigation')
        return { usePathname: () => '/properties' };
      if (name === '@/lib/env')
        return { publicEnv: () => (configured ? {} : null) };
      if (name === '@/lib/supabase/browser')
        return {
          browserClient: () => ({
            auth: {
              onAuthStateChange(callback: typeof listener) {
                listener = callback;
                return {
                  data: {
                    subscription: {
                      unsubscribe() {
                        unsubscribed = true;
                      },
                    },
                  },
                };
              },
            },
          }),
        };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return {
    cta: () => exports.Navigation().props.children.at(-1),
    event: (event: string, session: unknown) => listener(event, session),
    cleanup: () => cleanup?.(),
    unsubscribed: () => unsubscribed,
  };
}
function checkCTA(
  harness: ReturnType<typeof navigation>,
  label: string,
  href: string,
  busy = false,
) {
  const cta = harness.cta();
  assert.equal(cta.props.children[0], label);
  assert.equal(cta.props.href, href);
  assert.equal(cta.props['aria-busy'], busy);
  assert.equal(cta.props.className, 'header-cta');
}
test('header waits for initial auth and follows sign-in, refresh and sign-out', () => {
  const nav = navigation();
  checkCTA(nav, 'Account', '/account', true);
  nav.event('INITIAL_SESSION', null);
  checkCTA(nav, 'Sign in', '/auth/sign-in');
  for (const event of ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED']) {
    nav.event(event, { user: { id: 'guest-or-host' } });
    checkCTA(nav, 'Account', '/account');
  }
  nav.event('SIGNED_OUT', null);
  checkCTA(nav, 'Sign in', '/auth/sign-in');
  nav.cleanup();
  assert.equal(nav.unsubscribed(), true);
});
test('existing guest and host sessions resolve to account without sign-in CTA', () => {
  for (const role of ['guest', 'host']) {
    const nav = navigation();
    checkCTA(nav, 'Account', '/account', true);
    nav.event('INITIAL_SESSION', { user: { id: role } });
    checkCTA(nav, 'Account', '/account');
  }
});
test('unconfigured preview resolves to sign-in without creating an auth client', () => {
  const nav = navigation(false);
  nav.cta();
  checkCTA(nav, 'Sign in', '/auth/sign-in');
});
