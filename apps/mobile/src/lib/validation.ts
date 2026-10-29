import { nairaToKobo, propertyTypes, type HostPhoto } from '@fuhara/core/host';

export type ListingDraft = {
  id?: string;
  updatedAt?: string;
  title: string;
  description: string;
  propertyType: string;
  addressLine: string;
  area: string;
  city: string;
  state: string;
  country: string;
  bedrooms: string;
  bathrooms: string;
  maxGuests: string;
  nightlyRate: string;
  amenities: string;
  checkInTime: string;
  checkOutTime: string;
  houseRules: string;
  cancellationPolicy: string;
  photos: HostPhoto[];
};

export function nextDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function validateStayDates(
  checkIn: string,
  checkOut: string,
  today: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)
  ) {
    return 'Use dates in YYYY-MM-DD format.';
  }
  if (checkIn < today) return 'Check-in cannot be in the past.';
  if (checkOut <= checkIn) return 'Check-out must be after check-in.';
  return null;
}

export function parseListingDraft(draft: ListingDraft) {
  const text = (value: string) => value.trim();
  const nightlyRateKobo = nairaToKobo(text(draft.nightlyRate));
  if (!nightlyRateKobo) throw new Error('Enter a valid nightly rate in NGN.');
  if (
    ![
      'fct',
      'abuja',
      'abuja fct',
      'abuja/fct',
      'federal capital territory',
    ].includes(text(draft.state).toLowerCase()) ||
    !['ng', 'nigeria'].includes(text(draft.country).toLowerCase())
  ) {
    throw new Error('Only Abuja / FCT properties can be submitted.');
  }
  const data = {
    title: text(draft.title),
    description: text(draft.description),
    property_type: text(draft.propertyType),
    address_line: text(draft.addressLine),
    area: text(draft.area),
    city: text(draft.city),
    state: text(draft.state),
    country: text(draft.country),
    bedrooms: Number(draft.bedrooms),
    bathrooms: Number(draft.bathrooms),
    max_guests: Number(draft.maxGuests),
    nightly_rate_kobo: nightlyRateKobo,
    check_in_time: text(draft.checkInTime),
    check_out_time: text(draft.checkOutTime),
    house_rules: text(draft.houseRules),
    cancellation_policy: text(draft.cancellationPolicy),
    images: draft.photos,
    amenities: draft.amenities
      .split('\n')
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 50)
      .map((label, index) => ({ code: `amenity_${index}`, label })),
  };
  for (const [value, min, max, label] of [
    [data.title, 5, 160, 'title'],
    [data.description, 30, 10000, 'description'],
    [data.address_line, 5, 300, 'address'],
    [data.area, 1, 100, 'area'],
    [data.city, 1, 100, 'city'],
    [data.house_rules, 5, 2000, 'house rules'],
    [data.cancellation_policy, 5, 1000, 'cancellation policy'],
  ] as const) {
    if (value.length < min || value.length > max)
      throw new Error(`Please check the ${label}.`);
  }
  if (
    !propertyTypes.includes(
      data.property_type as (typeof propertyTypes)[number],
    ) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.check_in_time) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.check_out_time) ||
    !Number.isInteger(data.bedrooms) ||
    data.bedrooms < 0 ||
    data.bedrooms > 100 ||
    !Number.isFinite(data.bathrooms) ||
    data.bathrooms < 0 ||
    data.bathrooms > 100 ||
    (data.bathrooms * 2) % 1 ||
    !Number.isInteger(data.max_guests) ||
    data.max_guests < 1 ||
    data.max_guests > 100
  )
    throw new Error('Check the property type, rooms and guest capacity.');
  if (data.images.length < 1 || data.images.length > 20) {
    throw new Error('Add between 1 and 20 photos.');
  }
  return data;
}
