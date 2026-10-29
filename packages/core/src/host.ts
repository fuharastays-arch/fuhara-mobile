export const propertyTypes = [
  'apartment',
  'house',
  'villa',
  'studio',
  'serviced_apartment',
  'hotel',
  'other',
] as const;
export const abujaNeighbourhoods = [
  'Apo',
  'Asokoro',
  'Durumi',
  'Garki',
  'Guzape',
  'Gwarinpa',
  'Jabi',
  'Katampe',
  'Kubwa',
  'Lokogoma',
  'Lugbe',
  'Maitama',
  'Utako',
  'Wuse',
  'Wuse 2',
  'Wuye',
] as const;
export const amenityOptions = [
  { code: 'wifi', label: 'Wi-Fi' },
  { code: 'air_conditioning', label: 'Air conditioning' },
  { code: 'power_24h', label: '24-hour power' },
  { code: 'kitchen', label: 'Kitchen' },
  { code: 'parking', label: 'Parking' },
  { code: 'security', label: 'Security' },
  { code: 'smart_tv', label: 'Smart TV' },
  { code: 'workspace', label: 'Dedicated workspace' },
  { code: 'washer', label: 'Washing machine' },
  { code: 'pool', label: 'Pool' },
] as const;
export type HostPhoto = {
  url?: string;
  storage_path?: string | null;
  alt_text: string;
};
export type HostProperty = {
  id: string;
  title: string;
  description: string;
  property_type: string;
  address_line: string;
  area: string;
  city: string;
  state: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  nightly_rate_kobo: string | number;
  status: string;
  rejection_reason: string | null;
  updated_at: string;
  cover_image_url: string | null;
  property_images: HostPhoto[];
  property_amenities: { code: string; label: string }[];
  check_in_time?: string;
  check_out_time?: string;
  house_rules?: string;
  cancellation_policy?: string;
  minimum_stay_nights?: number;
  cleaning_fee_kobo?: string | number;
};
export type HostBookingDecision = {
  bookingId: string;
  decision: 'accept' | 'decline';
  reason: string | null;
};
export function nairaToKobo(value: string): string | null {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return amount >= 100n && amount <= 9007199254740991n
    ? amount.toString()
    : null;
}
export function hostMoney(value: string | number) {
  const amount = BigInt(value);
  const whole = (amount / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = amount % 100n;
  return `₦${whole}${fraction ? `.${fraction.toString().padStart(2, '0')}` : ''}`;
}
export function parseHostBookingDecision(form: FormData): HostBookingDecision {
  const bookingId = String(form.get('booking_id') ?? '');
  const decision = String(form.get('decision') ?? '');
  const reason = String(form.get('reason') ?? '').trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bookingId,
    )
  )
    throw Error('Invalid booking request.');
  if (decision !== 'accept' && decision !== 'decline')
    throw Error('Choose accept or decline.');
  if (decision === 'decline' && (reason.length < 5 || reason.length > 500))
    throw Error('Provide a decline reason between 5 and 500 characters.');
  return {
    bookingId,
    decision,
    reason: decision === 'decline' ? reason : null,
  };
}
export function parseHostProperty(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const nightly_rate_kobo = nairaToKobo(text('nightly_rate'));
  if (!nightly_rate_kobo)
    throw Error(
      'Enter a valid nightly rate in NGN with at most two decimal places.',
    );
  if (
    ![
      'fct',
      'abuja',
      'abuja fct',
      'abuja/fct',
      'federal capital territory',
    ].includes(text('state').toLowerCase()) ||
    !['ng', 'nigeria'].includes(text('country').toLowerCase())
  )
    throw Error('Only Abuja / FCT properties can be submitted.');
  const data = {
    title: text('title'),
    description: text('description'),
    property_type: text('property_type'),
    address_line: text('address_line'),
    area: text('area'),
    city: text('city'),
    state: text('state'),
    country: text('country'),
    bedrooms: Number(text('bedrooms')),
    bathrooms: Number(text('bathrooms')),
    max_guests: Number(text('max_guests')),
    nightly_rate_kobo,
    check_in_time: text('check_in_time') || '15:00',
    check_out_time: text('check_out_time') || '11:00',
    house_rules: text('house_rules'),
    cancellation_policy: text('cancellation_policy'),
  };
  for (const [key, min, max] of [
    ['title', 5, 160],
    ['description', 30, 10000],
    ['address_line', 5, 300],
    ['area', 1, 100],
    ['city', 1, 100],
    ['house_rules', 5, 2000],
    ['cancellation_policy', 5, 1000],
  ] as const)
    if (data[key].length < min || data[key].length > max)
      throw Error(`Please check ${key.replaceAll('_', ' ')}.`);
  if (
    !propertyTypes.some((t) => t === data.property_type) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.check_in_time) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.check_out_time) ||
    !Number.isInteger(data.bedrooms) ||
    data.bedrooms < 0 ||
    data.bedrooms > 100 ||
    !Number.isInteger(data.max_guests) ||
    data.max_guests < 1 ||
    data.max_guests > 100 ||
    !Number.isFinite(data.bathrooms) ||
    data.bathrooms < 0 ||
    data.bathrooms > 100 ||
    (data.bathrooms * 2) % 1
  )
    throw Error('Check the property type, rooms and guest capacity.');
  const images = JSON.parse(text('images')) as HostPhoto[];
  const amenities = JSON.parse(text('amenities')) as {
    code: string;
    label: string;
  }[];
  if (
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > 20 ||
    !Array.isArray(amenities) ||
    amenities.length > 50
  )
    throw Error('Add 1–20 photos and at most 50 amenities.');
  return { ...data, images, amenities };
}
