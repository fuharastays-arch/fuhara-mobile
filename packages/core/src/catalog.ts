export const propertyTypes = [
  'apartment',
  'house',
  'villa',
  'studio',
  'serviced_apartment',
  'hotel',
  'other',
] as const;
export type CatalogFilters = {
  destination: string;
  guests: number;
  type: string;
  maxRate: number | null;
  sort: string;
  page: number;
};
export type CatalogProperty = {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  area: string | null;
  city: string;
  state: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  nightly_rate_kobo: number;
  currency_code: 'NGN';
  cover_image_url: string | null;
  images: { id: string; url: string; alt_text: string; position: number }[];
  amenities: { code: string; label: string }[];
};
export type CatalogPage = { items: CatalogProperty[]; has_more: boolean };
export function parseFilters(
  raw: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const str = (key: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string) : '';
  const integer = (key: string, fallback: number, max: number) =>
    /^\d+$/.test(str(key)) && Number(str(key)) >= 1 && Number(str(key)) <= max
      ? Number(str(key))
      : fallback;
  const max = str('maxPrice');
  return {
    destination: str('destination').trim().slice(0, 80),
    guests: integer('guests', 1, 100),
    type: propertyTypes.includes(str('type') as (typeof propertyTypes)[number])
      ? str('type')
      : '',
    maxRate:
      /^\d+$/.test(max) && Number.isSafeInteger(Number(max) * 100)
        ? Number(max) * 100
        : null,
    sort: ['newest', 'price_low', 'price_high'].includes(str('sort'))
      ? str('sort')
      : 'newest',
    page: integer('page', 1, 1000),
  };
}
export function catalogHref(filters: CatalogFilters, page = filters.page) {
  const query = new URLSearchParams({
    destination: filters.destination,
    guests: String(filters.guests),
    type: filters.type,
    sort: filters.sort,
    page: String(page),
  });
  if (filters.maxRate !== null)
    query.set('maxPrice', String(filters.maxRate / 100));
  return `/properties?${query}`;
}
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function money(kobo: number) {
  if (!Number.isSafeInteger(kobo) || kobo < 0) throw new Error('Invalid money');
  const amount = BigInt(kobo);
  const whole = new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(amount / 100n);
  const fraction = amount % 100n;
  return `₦${whole}${fraction ? `.${fraction.toString().padStart(2, '0')}` : ''}`;
}
export function parseCatalog(value: unknown): CatalogPage {
  const fail = (): never => {
    throw new Error('Invalid catalog response');
  };
  const obj = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : fail();
  const text = (v: unknown): string => (typeof v === 'string' ? v : fail());
  const nullable = (v: unknown): string | null => (v === null ? null : text(v));
  const num = (v: unknown, min: number, integer = true): number =>
    typeof v === 'number' &&
    Number.isFinite(v) &&
    v >= min &&
    (!integer || Number.isSafeInteger(v))
      ? v
      : fail();
  const uuid = (v: unknown): string =>
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(text(v))
      ? text(v)
      : fail();
  const page = obj(value);
  if (
    !Array.isArray(page.items) ||
    page.items.length > 12 ||
    typeof page.has_more !== 'boolean'
  )
    fail();
  const items = (page.items as unknown[]).map((v) => {
    const p = obj(v);
    if (
      p.currency_code !== 'NGN' ||
      typeof p.nightly_rate_kobo !== 'string' ||
      !/^\d+$/.test(p.nightly_rate_kobo)
    )
      fail();
    const rate = Number(p.nightly_rate_kobo);
    if (
      !Number.isSafeInteger(rate) ||
      rate < 0 ||
      !propertyTypes.includes(p.property_type as (typeof propertyTypes)[number])
    )
      fail();
    if (
      !Array.isArray(p.images) ||
      p.images.length > 20 ||
      !Array.isArray(p.amenities) ||
      p.amenities.length > 50
    )
      fail();
    return {
      id: uuid(p.id),
      title: text(p.title),
      description: nullable(p.description),
      property_type: text(p.property_type),
      area: nullable(p.area),
      city: text(p.city),
      state: text(p.state),
      country: text(p.country),
      bedrooms: num(p.bedrooms, 0),
      bathrooms: num(p.bathrooms, 0, false),
      max_guests: num(p.max_guests, 1),
      nightly_rate_kobo: rate,
      currency_code: 'NGN' as const,
      cover_image_url: safeImageUrl(p.cover_image_url),
      images: (p.images as unknown[])
        .map((v) => {
          const i = obj(v);
          return {
            id: uuid(i.id),
            url: safeImageUrl(i.url) ?? '',
            alt_text: text(i.alt_text),
            position: num(i.position, 0),
          };
        })
        .filter((i) => i.url),
      amenities: (p.amenities as unknown[]).map((v) => {
        const a = obj(v);
        return { code: text(a.code), label: text(a.label) };
      }),
    };
  });
  return { items, has_more: page.has_more as boolean };
}
export type StayEstimate =
  | { ok: false; message: string }
  | {
      ok: true;
      nights: number;
      subtotalKobo: number;
      availability: 'unconfirmed';
      booking: 'unavailable';
    };
export function estimateStay(
  input: {
    checkIn: string;
    checkOut: string;
    guests: number;
    maxGuests: number;
    rateKobo: number;
  },
  today = new Date().toISOString().slice(0, 10),
): StayEstimate {
  const date = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (!date(input.checkIn) || !date(input.checkOut))
    return { ok: false, message: 'Choose valid check-in and check-out dates.' };
  if (input.checkIn < today)
    return { ok: false, message: 'Check-in cannot be in the past.' };
  const nights =
    (Date.parse(input.checkOut) - Date.parse(input.checkIn)) / 86400000;
  if (nights < 1 || nights > 90)
    return { ok: false, message: 'Choose a stay between 1 and 90 nights.' };
  if (
    !Number.isSafeInteger(input.guests) ||
    input.guests < 1 ||
    input.guests > input.maxGuests
  )
    return {
      ok: false,
      message: `Choose between 1 and ${input.maxGuests} guests.`,
    };
  const subtotalKobo = input.rateKobo * nights;
  if (
    !Number.isSafeInteger(input.rateKobo) ||
    input.rateKobo < 0 ||
    !Number.isSafeInteger(subtotalKobo)
  )
    return {
      ok: false,
      message: 'A price estimate is unavailable for this stay.',
    };
  return {
    ok: true,
    nights,
    subtotalKobo,
    availability: 'unconfirmed',
    booking: 'unavailable',
  };
}
