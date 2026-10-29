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
  checkIn: string;
  checkOut: string;
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
  check_in_time: string;
  check_out_time: string;
  house_rules: string;
  cancellation_policy: string;
  minimum_stay_nights: number;
  cleaning_fee_kobo: number;
  host_first_name: string | null;
  host_verified: boolean;
  stay_nights: number | null;
  stay_total_kobo: number | null;
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
  const isoDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
      ? value
      : '';
  const checkIn = isoDate(str('checkIn'));
  const checkOut = isoDate(str('checkOut'));
  const validRange = checkIn && checkOut && checkOut > checkIn;
  return {
    destination: str('destination').trim().slice(0, 80),
    guests: integer('guests', 1, 100),
    checkIn: validRange ? checkIn : '',
    checkOut: validRange ? checkOut : '',
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
  if (filters.checkIn && filters.checkOut) {
    query.set('checkIn', filters.checkIn);
    query.set('checkOut', filters.checkOut);
  }
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

const supabasePublicObjectPath = '/storage/v1/object/public/';
const supabasePublicRenderPath = '/storage/v1/render/image/public/';

function isSupabaseStorageUrl(url: URL) {
  return /^[a-z0-9]+\.supabase\.co$/i.test(url.hostname);
}

export function originalImageUrl(value: unknown): string | null {
  const safe = safeImageUrl(value);
  if (!safe) return null;

  const url = new URL(safe);
  if (
    isSupabaseStorageUrl(url) &&
    url.pathname.startsWith(supabasePublicRenderPath)
  ) {
    url.pathname = url.pathname.replace(
      supabasePublicRenderPath,
      supabasePublicObjectPath,
    );
    url.search = '';
  }

  return url.href;
}

export function thumbnailImageUrl(
  value: unknown,
  width = 440,
  quality = 82,
): string | null {
  const original = originalImageUrl(value);
  if (!original) return null;

  const url = new URL(original);
  if (
    !Number.isSafeInteger(width) ||
    width < 64 ||
    width > 2000 ||
    !Number.isSafeInteger(quality) ||
    quality < 20 ||
    quality > 100 ||
    !isSupabaseStorageUrl(url) ||
    !url.pathname.startsWith(supabasePublicObjectPath)
  ) {
    return original;
  }

  url.pathname = url.pathname.replace(
    supabasePublicObjectPath,
    supabasePublicRenderPath,
  );
  url.search = '';
  url.searchParams.set('width', String(width));
  url.searchParams.set('quality', String(quality));
  url.searchParams.set('resize', 'contain');
  return url.href;
}
export function money(kobo: number) {
  if (!Number.isSafeInteger(kobo) || kobo < 0) throw new Error('Invalid money');
  const whole = new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(Math.trunc(kobo / 100));
  const fraction = kobo % 100;
  return `₦${whole}${fraction ? `.${fraction.toString().padStart(2, '0')}` : ''}`;
}
// Fail closed against a backend that has not deployed launch-market enforcement.
export function parseLaunchCatalog(value: unknown): CatalogPage {
  if (
    !value ||
    typeof value !== 'object' ||
    !('launch_market_contract' in value) ||
    ![1, 2].includes(value.launch_market_contract as number)
  ) {
    throw new Error('Launch-market contract unavailable');
  }
  return parseCatalog(value);
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
      check_in_time:
        typeof p.check_in_time === 'string' ? p.check_in_time : '15:00:00',
      check_out_time:
        typeof p.check_out_time === 'string' ? p.check_out_time : '11:00:00',
      house_rules:
        typeof p.house_rules === 'string'
          ? p.house_rules
          : 'Please respect the property and the neighbourhood.',
      cancellation_policy:
        typeof p.cancellation_policy === 'string'
          ? p.cancellation_policy
          : 'Free cancellation while the booking request is awaiting host acceptance.',
      minimum_stay_nights:
        typeof p.minimum_stay_nights === 'number' &&
        Number.isSafeInteger(p.minimum_stay_nights) &&
        p.minimum_stay_nights >= 1
          ? p.minimum_stay_nights
          : 1,
      cleaning_fee_kobo:
        typeof p.cleaning_fee_kobo === 'string' &&
        /^\d+$/.test(p.cleaning_fee_kobo)
          ? Number(p.cleaning_fee_kobo)
          : 0,
      host_first_name:
        p.host_first_name === null || typeof p.host_first_name === 'string'
          ? (p.host_first_name as string | null)
          : null,
      host_verified: p.host_verified === true,
      stay_nights:
        typeof p.stay_nights === 'number' && Number.isSafeInteger(p.stay_nights)
          ? p.stay_nights
          : null,
      stay_total_kobo:
        typeof p.stay_total_kobo === 'string' && /^\d+$/.test(p.stay_total_kobo)
          ? Number(p.stay_total_kobo)
          : null,
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
