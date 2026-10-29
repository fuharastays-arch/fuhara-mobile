import { createServer } from 'node:http';
export const fixtureId = '11111111-1111-4111-8111-000000000001';
export const fixtureProperty = {
  id: fixtureId,
  title: 'TEST FIXTURE — Garden apartment',
  description: 'Test-only property description.',
  property_type: 'apartment',
  area: 'Maitama',
  city: 'Abuja',
  state: 'FCT',
  country: 'Nigeria',
  bedrooms: 2,
  bathrooms: 2.5,
  max_guests: 4,
  nightly_rate_kobo: '4500000',
  currency_code: 'NGN',
  cover_image_url: 'https://example.test/cover.jpg',
  images: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      url: 'https://example.test/gallery.jpg',
      alt_text: 'Test-only gallery image',
      position: 0,
    },
  ],
  amenities: [
    { code: 'wifi', label: 'Wi-Fi' },
    { code: 'parking', label: 'On-site parking' },
  ],
};
export function startCatalogFixture(port = 4011) {
  const requests = [];
  const server = createServer(async (req, res) => {
    // Loopback-only Auth fixture for browser navigation regression. No real
    // provider, identity, credential, or email delivery is involved.
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3012');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    const user = {
      id: fixtureId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'guest@example.test',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    };
    if (req.url.startsWith('/auth/v1/token')) {
      const encode = (value) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const expires = Math.floor(Date.now() / 1000) + 3600;
      const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: fixtureId, exp: expires, role: 'authenticated' })}.fixture-only`;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          access_token: token,
          refresh_token: 'fixture-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: expires,
          user,
        }),
      );
      return;
    }
    if (req.url === '/auth/v1/user') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(user));
      return;
    }
    if (req.url.startsWith('/auth/v1/logout')) {
      res.writeHead(204).end();
      return;
    }
    if (/^\/rest\/v1\/(profiles|user_accounts|host_profiles)\?/.test(req.url)) {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify(
          req.url.startsWith('/rest/v1/profiles?')
            ? {
                id: fixtureId,
                first_name: 'Fixture',
                last_name: 'Guest',
                email: user.email,
              }
            : req.url.startsWith('/rest/v1/user_accounts?')
              ? { user_id: fixtureId, status: 'active', is_host: false }
              : null,
        ),
      );
      return;
    }
    if (
      req.url !== '/rest/v1/rpc/product_catalog_v1' ||
      req.method !== 'POST'
    ) {
      res.writeHead(404).end();
      return;
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const params = JSON.parse(raw);
    requests.push({ params, headers: req.headers });
    res.setHeader('Content-Type', 'application/json');
    if (params.p_destination === 'Failure') {
      res
        .writeHead(503)
        .end(JSON.stringify({ message: 'INTERNAL_SECRET_MUST_NOT_RENDER' }));
      return;
    }
    if (params.p_destination === 'Malformed') {
      res.end(
        JSON.stringify({
          items: [
            { ...fixtureProperty, nightly_rate_kobo: '9007199254740992' },
          ],
          has_more: false,
        }),
      );
      return;
    }
    if (params.p_destination === 'Slow')
      await new Promise((resolve) => setTimeout(resolve, 1200));
    const empty =
      params.p_destination === 'Empty' ||
      (params.p_id && params.p_id !== fixtureId);
    res.end(
      JSON.stringify({
        items: empty ? [] : [fixtureProperty],
        has_more: params.p_destination === 'Paged' && params.p_page === 1,
      }),
    );
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => resolve({ server, requests })),
  );
}
