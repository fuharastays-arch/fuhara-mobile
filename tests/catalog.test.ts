import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFilters,
  catalogHref,
  parseCatalog,
  safeImageUrl,
  estimateStay,
  money,
} from '../packages/core/src/catalog.ts';
const property = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'A real stay',
  description: null,
  property_type: 'apartment',
  area: null,
  city: 'Abuja',
  state: 'FCT',
  country: 'Nigeria',
  bedrooms: 1,
  bathrooms: 1.5,
  max_guests: 2,
  nightly_rate_kobo: '1500000',
  currency_code: 'NGN',
  cover_image_url: null,
  images: [],
  amenities: [],
};
test('catalog parser projects supported fields and excludes private fields', () => {
  const result = parseCatalog({
    items: [{ ...property, host_id: 'secret', address_line: 'private' }],
    has_more: false,
  });
  assert.equal(result.items[0].nightly_rate_kobo, 1500000);
  assert.equal(result.items[0].bathrooms, 1.5);
  assert.equal('host_id' in result.items[0], false);
  assert.equal('address_line' in result.items[0], false);
});
test('unsafe money, unknown currencies and malformed contracts fail closed', () => {
  for (const value of [
    { ...property, nightly_rate_kobo: '9007199254740992' },
    { ...property, nightly_rate_kobo: 123 },
    { ...property, currency_code: 'USD' },
    { ...property, max_guests: 0 },
    { ...property, property_type: 'fake' },
    { ...property, id: 'invalid' },
  ])
    assert.throws(() => parseCatalog({ items: [value], has_more: false }));
  assert.throws(() => parseCatalog({ items: [], has_more: 'false' }));
  assert.throws(() =>
    parseCatalog({ items: Array(13).fill(property), has_more: true }),
  );
});
test('filter boundaries and duplicate parameters are normalized', () => {
  assert.deepEqual(
    parseFilters({
      guests: '-1',
      page: '1001',
      type: 'fake',
      sort: 'bad',
      maxPrice: '1e12',
      destination: ['Abuja', 'Lagos'],
    }),
    {
      destination: '',
      guests: 1,
      type: '',
      sort: 'newest',
      maxRate: null,
      page: 1,
    },
  );
  const filters = parseFilters({
    destination: '  Abuja  ',
    maxPrice: '0',
    guests: '4',
    type: 'villa',
    sort: 'price_low',
    page: '2',
  });
  assert.equal(filters.maxRate, 0);
  assert.equal(filters.destination, 'Abuja');
  assert.equal(
    new URL(catalogHref(filters, 3), 'http://localhost').searchParams.get(
      'page',
    ),
    '3',
  );
  assert.equal(parseFilters({ maxPrice: '9007199254740991' }).maxRate, null);
});
test('only HTTPS image URLs without embedded credentials render', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    'http://example.com/a.jpg',
    'https://user:pass@example.com/a.jpg',
    '/a.jpg',
  ])
    assert.equal(safeImageUrl(url), null);
  assert.equal(
    safeImageUrl('https://example.com/a.jpg'),
    'https://example.com/a.jpg',
  );
});
const stay = {
  checkIn: '2027-02-28',
  checkOut: '2027-03-02',
  guests: 2,
  maxGuests: 2,
  rateKobo: 1500000,
};
test('nightly estimates use integer kobo and never assert availability', () => {
  assert.deepEqual(estimateStay(stay, '2027-01-01'), {
    ok: true,
    nights: 2,
    subtotalKobo: 3000000,
    availability: 'unconfirmed',
    booking: 'unavailable',
  });
  assert.match(money(1500050), /15,000.50/);
  assert.equal(money(Number.MAX_SAFE_INTEGER), '₦90,071,992,547,409.91');
  assert.throws(() => money(0.1));
});
test('date, occupancy, duration, and overflow constraints', () => {
  for (const patch of [
    { checkIn: '2027-02-29' },
    { checkOut: '2027-02-28' },
    { checkOut: '2027-08-01' },
    { guests: 3 },
    { guests: 1.5 },
    { rateKobo: Number.MAX_SAFE_INTEGER },
    { checkIn: '2026-01-01' },
    { checkIn: '' },
  ])
    assert.equal(estimateStay({ ...stay, ...patch }, '2027-01-01').ok, false);
  assert.equal(
    estimateStay(
      { ...stay, checkIn: '2028-02-29', checkOut: '2028-03-01' },
      '2028-02-01',
    ).ok,
    true,
  );
});
