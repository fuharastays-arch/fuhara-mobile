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
