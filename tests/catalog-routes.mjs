// Isolated production build against a loopback-only test API. Never seeds real Supabase.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { startCatalogFixture, fixtureId } from './catalog-fixture.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const web = fileURLToPath(new URL('../apps/web/', import.meta.url));
const next = fileURLToPath(
  new URL('../node_modules/next/dist/bin/next', import.meta.url),
);
const env = {
  ...process.env,
  FUHARA_BUILD_DIR: '.next-catalog-test',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4011',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3012',
};
const generatedFiles = ['next-env.d.ts', 'tsconfig.json'];
const originalFiles = await Promise.all(
  generatedFiles.map((name) => readFile(`${web}${name}`, 'utf8')),
);
const fixture = await startCatalogFixture();
let app;
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function page(path) {
  const res = await fetch(`http://localhost:3012${path}`);
  return { res, html: await res.text() };
}
try {
  const build = spawn(process.execPath, [next, 'build'], {
    cwd: web,
    env,
    stdio: 'inherit',
  });
  const [code] = await once(build, 'exit');
  assert.equal(code, 0, 'Test production build failed');
  app = spawn(process.execPath, [next, 'start', '-p', '3012'], {
    cwd: web,
    env,
    stdio: 'inherit',
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch('http://localhost:3012')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, 'Test app did not start');
  await check(
    'full route smoke suite on the matching callback origin',
    async () => {
      const smoke = spawn(process.execPath, ['--test', 'tests/smoke.mjs'], {
        cwd: root,
        env: { ...env, TEST_BASE_URL: 'http://localhost:3012' },
        stdio: 'inherit',
      });
      const [code] = await once(smoke, 'exit');
      assert.equal(code, 0, 'Route smoke tests failed');
    },
  );
  await check(
    'header never renders a false signed-out CTA before hydration',
    async () => {
      const { html } = await page('/');
      const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
      assert.match(
        header,
        /class="header-cta" aria-busy="true" href="\/account"/,
      );
      assert.doesNotMatch(header, /Sign in/);
    },
  );
  await check(
    'populated catalog renders supported details and prices',
    async () => {
      const { html } = await page('/properties');
      assert.match(html, /TEST FIXTURE/);
      assert.match(html, /45,000/);
      assert.match(html, /Approved stay/);
      assert.match(html, /2.5/);
    },
  );
  await check('filter arguments reach RPC as validated values', async () => {
    await page(
      '/properties?destination=Abuja&guests=4&type=apartment&maxPrice=50000&sort=price_low&page=2',
    );
    assert.deepEqual(fixture.requests.at(-1).params, {
      p_destination: 'Abuja',
      p_guests: 4,
      p_type: 'apartment',
      p_max_rate: 5000000,
      p_sort: 'price_low',
      p_page: 2,
      p_id: null,
    });
  });
  await check('empty is distinct from backend failure', async () => {
    const { html } = await page('/properties?destination=Empty');
    assert.match(html, /No stays match/);
    assert.doesNotMatch(html, /temporarily unavailable/);
  });
  await check(
    'backend error is recoverable without exposing provider details',
    async () => {
      const { html } = await page('/properties?destination=Failure');
      assert.match(html, /temporarily unavailable/);
      assert.match(html, /Try again/);
      assert.doesNotMatch(html, /INTERNAL_SECRET_MUST_NOT_RENDER/);
      assert.doesNotMatch(html, /No stays match/);
    },
  );
  await check('malformed contract fails closed', async () => {
    const { html } = await page('/properties?destination=Malformed');
    assert.match(html, /temporarily unavailable/);
    assert.doesNotMatch(html, /TEST FIXTURE/);
  });
  await check('pagination preserves filters', async () => {
    const { html } = await page('/properties?destination=Paged&guests=3');
    assert.match(html, /Next page/);
    assert.match(html, /page=2/);
    assert.match(html, /guests=3/);
  });
  await check(
    'real detail path renders gallery amenities and booking boundary',
    async () => {
      const { html } = await page(`/properties/${fixtureId}`);
      assert.match(html, /Wi-Fi/);
      assert.match(html, /Test-only gallery image/);
      assert.match(html, /Plan your stay/);
      assert.match(html, /Booking coming soon/);
      assert.match(html, /disabled/);
      assert.match(html, /not yet confirmed/);
    },
  );
  await check('missing and malformed IDs return HTTP 404', async () => {
    const missing = await page(
      '/properties/99999999-9999-4999-8999-999999999999',
    );
    assert.equal(missing.res.status, 404);
    assert.match(missing.html, /This place isn’t available/);
    const invalid = await page('/properties/not-a-uuid');
    assert.equal(invalid.res.status, 404);
  });
  await check('catalog requests never forward staff cookies', async () => {
    await fetch('http://localhost:3012/properties', {
      headers: { Cookie: 'staff-token=private' },
    });
    assert.equal(fixture.requests.at(-1).headers.cookie, undefined);
    assert.equal(fixture.requests.at(-1).headers.authorization, undefined);
    assert.equal(
      fixture.requests.at(-1).headers.apikey,
      'sb_publishable_test_fixture',
    );
  });
  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {}),
    });
    try {
      const p = await browser.newPage();
      await check(
        'header updates after real form sign-in, navigation, reload and sign-out',
        async () => {
          await p.goto('http://localhost:3012/auth/sign-in');
          await p.locator('.header-cta').getByText('Sign in').waitFor();
          await p.getByLabel('Email address').fill('guest@example.test');
          await p
            .getByLabel('Password', { exact: true })
            .fill('fixture-password');
          await p.getByRole('button', { name: 'Welcome back' }).click();
          await p.waitForURL('http://localhost:3012/account');
          await p.locator('.header-cta').getByText('Account').waitFor();
          for (const width of [1440, 390, 320]) {
            await p.setViewportSize({ width, height: 1000 });
            await p
              .getByRole('navigation', { name: 'Main navigation' })
              .getByRole('link', { name: 'Find a stay' })
              .click();
            await p.waitForURL('http://localhost:3012/properties');
            assert.equal(
              await p.locator('.header-cta').getAttribute('href'),
              '/account',
            );
            assert.ok(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await p.reload();
            await p.locator('.header-cta').getByText('Account').waitFor();
            await p.locator('.header-cta').click();
            await p.waitForURL('http://localhost:3012/account');
          }
          await p.getByRole('button', { name: 'Sign out' }).click();
          await p.waitForURL('http://localhost:3012/');
          await p.locator('.header-cta').getByText('Sign in').waitFor();
        },
      );
      await p.route('https://example.test/**', (route) =>
        route.fulfill({
          path: `${root}apps/web/public/fuhara-living.jpg`,
          contentType: 'image/jpeg',
        }),
      );
      await check(
        'desktop catalog and mobile detail fit viewport',
        async () => {
          for (const width of [1440, 390]) {
            await p.setViewportSize({ width, height: 1000 });
            await p.goto('http://localhost:3012/properties');
            await p
              .getByRole('heading', { name: 'TEST FIXTURE — Garden apartment' })
              .waitFor();
            assert.ok(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await p.screenshot({
              path: `${root}docs/catalog-${width}.png`,
              fullPage: true,
            });
            await p.goto(`http://localhost:3012/properties/${fixtureId}`);
            await p.getByRole('heading', { name: 'Plan your stay.' }).waitFor();
            assert.ok(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await p.screenshot({
              path: `${root}docs/detail-${width}.png`,
              fullPage: true,
            });
          }
        },
      );
      await check(
        'date selection calculates subtotal but cannot book',
        async () => {
          const today = new Date();
          today.setUTCDate(today.getUTCDate() + 2);
          const start = today.toISOString().slice(0, 10);
          today.setUTCDate(today.getUTCDate() + 3);
          const end = today.toISOString().slice(0, 10);
          await p.getByLabel('Check-in', { exact: true }).fill(start);
          await p.getByLabel('Check-out', { exact: true }).fill(end);
          await p.getByText('Nightly subtotal').waitFor();
          assert.match(await p.locator('.estimate').innerText(), /135,000/);
          assert.equal(
            await p
              .getByRole('button', { name: 'Booking coming soon' })
              .isDisabled(),
            true,
          );
          await p.getByLabel('Guests', { exact: true }).fill('5');
          assert.match(
            await p.locator('.estimate').innerText(),
            /between 1 and 4/,
          );
        },
      );
      await check(
        'broken property image falls back without fabricated photography',
        async () => {
          await p.unroute('https://example.test/**');
          await p.route('https://example.test/**', (r) => r.abort());
          await p.reload();
          await p
            .getByRole('img', { name: 'Property photo unavailable' })
            .first()
            .waitFor();
        },
      );
    } finally {
      await browser.close();
    }
  }
  console.log(`${passed} catalog integration checks passed`);
} finally {
  if (app) app.kill();
  fixture.server.closeAllConnections();
  fixture.server.close();
  await Promise.all(
    generatedFiles.map((name, i) =>
      writeFile(`${web}${name}`, originalFiles[i]),
    ),
  );
}
