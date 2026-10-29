import { parseLaunchCatalog, type CatalogFilters } from '@fuhara/core/catalog';
import { parseHostKycStatus } from '@fuhara/core/kyc';
import { parseProfile, type Profile } from '@fuhara/core';
import { parseSupportTicketInput } from '@fuhara/core/support';
import { supabase } from './supabase';
import type {
  Account,
  Booking,
  BookingDetail,
  HostContext,
  HostDashboard,
  HostBookingDetail,
  HostListingSummary,
  HostProfile,
  PayoutReadiness,
  Quote,
  SupportTicket,
} from './types';
import { parseListingDraft, type ListingDraft } from './validation';

function unwrap<T>(
  result: { data: T | null; error: unknown },
  fallback: string,
): T {
  if (result.error) throw result.error;
  if (result.data === null) throw new Error(fallback);
  return result.data;
}

export async function loadCatalog(filters: CatalogFilters) {
  const result = await supabase.rpc('product_catalog_v2', {
    p_destination: filters.destination,
    p_guests: filters.guests,
    p_type: filters.type,
    p_max_rate: filters.maxRate,
    p_sort: filters.sort,
    p_page: filters.page,
    p_id: null,
    p_check_in: filters.checkIn || null,
    p_check_out: filters.checkOut || null,
  });
  return parseLaunchCatalog(unwrap(result, 'Stays could not be loaded.'));
}

export async function loadProperty(
  id: string,
  dates: { checkIn?: string; checkOut?: string; guests?: number } = {},
) {
  const result = await supabase.rpc('product_catalog_v2', {
    p_destination: '',
    p_guests: dates.guests || 1,
    p_type: '',
    p_max_rate: null,
    p_sort: 'newest',
    p_page: 1,
    p_id: id,
    p_check_in: dates.checkIn || null,
    p_check_out: dates.checkOut || null,
  });
  const page = parseLaunchCatalog(
    unwrap(result, 'Property could not be loaded.'),
  );
  return page.items[0] ?? null;
}

export async function loadFavoriteIds() {
  const { data, error } = await supabase
    .from('property_favorites')
    .select('property_id')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data || []).map((row) => row.property_id as string);
}

export async function loadFavoriteProperties(page = 1) {
  const result = await supabase.rpc('my_property_favorites_v1', {
    p_page: page,
  });
  return parseLaunchCatalog(unwrap(result, 'Favorites could not be loaded.'));
}

export async function saveFavorite(userId: string, propertyId: string) {
  const { error } = await supabase.from('property_favorites').insert({
    user_id: userId,
    property_id: propertyId,
  });
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

export async function unsaveFavorite(userId: string, propertyId: string) {
  const { error } = await supabase
    .from('property_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);
  if (error) throw error;
}

export async function quoteBooking(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
) {
  return unwrap(
    await supabase.rpc('quote_booking_v1', {
      p_property_id: propertyId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
    }),
    'A quote could not be prepared.',
  ) as Quote;
}

export async function requestBooking(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
) {
  return unwrap(
    await supabase.rpc('request_booking_v1', {
      p_property_id: propertyId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
    }),
    'The booking request could not be created.',
  ) as Booking;
}

export async function loadMyBookings(page = 1) {
  return unwrap(
    await supabase.rpc('my_booking_requests_v1', { p_page: page }),
    'Bookings could not be loaded.',
  ) as {
    items: Booking[];
    has_more: boolean;
  };
}

export async function loadBooking(id: string) {
  return unwrap(
    await supabase.rpc('my_booking_detail_v2', { p_booking_id: id }),
    'Booking could not be loaded.',
  ) as BookingDetail;
}

export async function cancelBooking(id: string) {
  const { error } = await supabase.rpc('cancel_booking_request_v1', {
    p_booking_id: id,
  });
  if (error) throw error;
}

export async function loadAccountContext(): Promise<HostContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user)
    return { profile: null, account: null, host: null, kyc: null };
  const id = userData.user.id;
  const [profile, account, host] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,first_name,last_name,email,phone')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('user_accounts')
      .select('user_id,status,is_host')
      .eq('user_id', id)
      .maybeSingle(),
    supabase
      .from('host_profiles')
      .select('user_id,kyc_status,rejection_reason')
      .eq('user_id', id)
      .maybeSingle(),
  ]);
  if (profile.error || account.error || host.error)
    throw profile.error || account.error || host.error;
  let kyc = null;
  if (account.data?.is_host) {
    const result = await supabase.rpc('host_kyc_status_v1');
    if (!result.error) kyc = parseHostKycStatus(result.data);
  }
  return {
    profile: profile.data as Profile | null,
    account: account.data as Account | null,
    host: host.data as HostProfile | null,
    kyc,
  };
}

export async function updateProfile(
  first: string,
  last: string,
  phone: string,
) {
  const parsed = parseProfile(first, last, phone);
  if (!parsed.ok) throw new Error(parsed.message);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    throw userError || new Error('Sign in again.');
  const { error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', userData.user.id);
  if (error) throw error;
}

export async function loadSupportTickets() {
  return unwrap(
    await supabase.rpc('my_support_tickets_v1'),
    'Support history could not be loaded.',
  ) as {
    items: SupportTicket[];
    has_more?: boolean;
  };
}

export async function loadSupportBookingOptions() {
  return unwrap(
    await supabase.rpc('my_support_booking_options_v1'),
    'Related bookings could not be loaded.',
  ) as {
    items: {
      booking_id: string;
      booking_number: number;
      property_name: string;
      check_in: string;
      check_out: string;
      role: 'guest' | 'host';
    }[];
  };
}

export async function createSupportTicket(
  category: string,
  subject: string,
  description: string,
  bookingId?: string | null,
) {
  const parsed = parseSupportTicketInput(
    category,
    subject,
    description,
    bookingId ?? null,
  );
  if (!parsed.ok) throw new Error(parsed.message);
  const { error } = await supabase.rpc('create_my_support_ticket_v1', {
    p_category: parsed.data.category,
    p_subject: parsed.data.subject,
    p_description: parsed.data.description,
    p_booking_id: parsed.data.bookingId,
  });
  if (error) throw error;
}

export async function applyToHost() {
  const { error } = await supabase.rpc('apply_to_host_v1');
  if (error) throw error;
}

export async function beginHostKyc() {
  const result = await supabase.rpc('begin_host_kyc_v1', {
    p_consent_version: 'host-kyc-v1',
  });
  const parsed = parseHostKycStatus(
    unwrap(result, 'KYC could not be started.'),
  );
  if (!parsed)
    throw new Error('KYC started, but its status could not be confirmed.');
  return parsed;
}

export async function loadHostDashboard(): Promise<HostDashboard> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    throw userError || new Error('Sign in again.');
  const [summary, listings, requests, stays] = await Promise.all([
    supabase.rpc('host_summary_v1'),
    supabase
      .from('properties')
      .select('id,title,status,rejection_reason,updated_at')
      .eq('host_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.rpc('host_booking_requests_v1', { p_page: 1 }),
    supabase.rpc('host_upcoming_stays_v1', { p_page: 1 }),
  ]);
  if (summary.error || listings.error || requests.error || stays.error) {
    throw summary.error || listings.error || requests.error || stays.error;
  }
  return {
    summary: summary.data as HostDashboard['summary'],
    listings: listings.data as HostListingSummary[],
    requests: requests.data as HostDashboard['requests'],
    stays: stays.data as HostDashboard['stays'],
  };
}

export async function loadHostBooking(id: string) {
  return unwrap(
    await supabase.rpc('host_booking_detail_v2', { p_booking_id: id }),
    'Booking could not be loaded.',
  ) as HostBookingDetail;
}

export async function decideHostBooking(
  id: string,
  decision: 'accept' | 'decline',
  reason: string | null,
) {
  const { error } = await supabase.rpc('host_decide_booking_v1', {
    p_booking_id: id,
    p_decision: decision,
    p_reason: decision === 'decline' ? reason : null,
  });
  if (error) throw error;
}

export async function loadPayoutReadiness() {
  return unwrap(
    await supabase.rpc('host_payout_readiness_v1'),
    'Payout readiness could not be loaded.',
  ) as PayoutReadiness;
}

export async function loadHostListing(id: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user)
    throw userError || new Error('Sign in again.');
  const [property, availability] = await Promise.all([
    supabase
      .from('properties')
      .select(
        'id,title,description,property_type,address_line,area,city,state,country,bedrooms,bathrooms,max_guests,nightly_rate_kobo,status,rejection_reason,updated_at,cover_image_url,check_in_time,check_out_time,house_rules,cancellation_policy,minimum_stay_nights,cleaning_fee_kobo,property_images(url,storage_path,alt_text,position),property_amenities(code,label)',
      )
      .eq('id', id)
      .eq('host_id', userData.user.id)
      .maybeSingle(),
    supabase
      .from('property_availability_blocks')
      .select('id,start_date,end_date,source,note,booking_id')
      .eq('property_id', id)
      .order('start_date'),
  ]);
  if (property.error || availability.error)
    throw property.error || availability.error;
  if (!property.data) throw new Error('Property not found.');
  return { property: property.data, availability: availability.data };
}

export async function saveHostListing(draft: ListingDraft) {
  const data = parseListingDraft(draft);
  return unwrap(
    await supabase.rpc('save_host_property_v2', {
      p_id: draft.id || null,
      p_expected_updated_at: draft.updatedAt || null,
      p_data: data,
    }),
    'The property could not be saved.',
  ) as string;
}

export async function updateHostListingPrice(
  propertyId: string,
  expectedUpdatedAt: string,
  nightlyRateKobo: string,
) {
  return unwrap(
    await supabase.rpc('update_host_property_pricing_v1', {
      p_property_id: propertyId,
      p_expected_updated_at: expectedUpdatedAt,
      p_nightly_rate_kobo: nightlyRateKobo,
    }),
    'The nightly rate could not be updated.',
  ) as { kept_live: boolean; updated_at: string };
}

export async function addAvailabilityBlock(
  propertyId: string,
  start: string,
  end: string,
  note: string,
) {
  const { error } = await supabase.from('property_availability_blocks').insert({
    property_id: propertyId,
    start_date: start,
    end_date: end,
    source: 'manual',
    note: note.trim().slice(0, 300),
  });
  if (error) throw error;
}

export async function removeAvailabilityBlock(propertyId: string, id: string) {
  const { data, error } = await supabase
    .from('property_availability_blocks')
    .delete()
    .eq('id', id)
    .eq('property_id', propertyId)
    .eq('source', 'manual')
    .is('booking_id', null)
    .select('id');
  if (error || !data?.length)
    throw error || new Error('This block cannot be removed.');
}
