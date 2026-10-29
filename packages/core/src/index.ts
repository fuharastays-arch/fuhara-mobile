// Verified projections from migrations 003, 005, 006, 007 and 017.
// These are deliberately not a fabricated generated schema.
export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
};
export type Account = {
  user_id: string;
  status: 'active' | 'suspended' | 'disabled';
  is_host: boolean;
};
export type HostProfile = {
  rejection_reason?: string | null;
  user_id: string;
  kyc_status: 'pending' | 'in_review' | 'verified' | 'rejected';
  submitted_at: string | null;
};
export type PropertySummary = {
  id: string;
  title: string;
  description: string | null;
  property_type:
    | 'apartment'
    | 'house'
    | 'villa'
    | 'studio'
    | 'serviced_apartment'
    | 'hotel'
    | 'other';
  area: string | null;
  city: string;
  state: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  nightly_rate_kobo: number;
  currency_code: string;
  cover_image_url: string | null;
};
export type BookingSummary = {
  id: string;
  booking_number: number;
  guest_id: string | null;
  property_id: string | null;
  property_name: string;
  check_in: string;
  check_out: string;
  total_amount_kobo: number;
  currency_code: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'checked_in'
    | 'completed'
    | 'cancelled'
    | 'disputed';
};
export type Result<T> = { ok: true; data: T } | { ok: false; message: string };
export const destinations = ['Abuja', 'Lagos'] as const;
export function safeNext(value: unknown): string {
  return typeof value === 'string' &&
    ['/account', '/account/profile', '/host/onboarding', '/host'].includes(
      value,
    )
    ? value
    : '/account';
}
export function parseCredentials(
  email: unknown,
  password: unknown,
  signup = false,
): Result<{ email: string; password: string }> {
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    return { ok: false, message: 'Enter a valid email address.' };
  if (
    typeof password !== 'string' ||
    password.length > 128 ||
    password.length < (signup ? 12 : 1)
  )
    return {
      ok: false,
      message: signup
        ? 'Use a password between 12 and 128 characters.'
        : 'Enter your password.',
    };
  return { ok: true, data: { email: email.trim().toLowerCase(), password } };
}
export function parseProfile(
  first: unknown,
  last: unknown,
  phone: unknown,
): Result<{ first_name: string; last_name: string; phone: string | null }> {
  if (
    typeof first !== 'string' ||
    typeof last !== 'string' ||
    !first.trim() ||
    !last.trim() ||
    first.trim().length > 80 ||
    last.trim().length > 80
  )
    return {
      ok: false,
      message: 'Enter your first and last name (up to 80 characters each).',
    };
  if (
    typeof phone !== 'string' ||
    phone.length > 30 ||
    (phone.trim() && !/^[+()\d\s-]{6,30}$/.test(phone.trim()))
  )
    return {
      ok: false,
      message: 'Enter a valid phone number or leave it blank.',
    };
  return {
    ok: true,
    data: {
      first_name: first.trim(),
      last_name: last.trim(),
      phone: phone.trim() || null,
    },
  };
}
export function hostAccess(account: Account | null, host: HostProfile | null) {
  return (
    account?.status === 'active' &&
    account.is_host &&
    host?.kyc_status === 'verified'
  );
}
export function isPropertyId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function discoveryQuery(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}
