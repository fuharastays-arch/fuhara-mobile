import type { CatalogProperty } from '@fuhara/core/catalog';
import type { HostKycStatus } from '@fuhara/core/kyc';

export type Quote = {
  property_id: string;
  property_title: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  available: boolean;
  availability_reason: string | null;
  nightly_rate_kobo: string;
  base_amount_kobo: string;
  guest_service_fee_kobo: string;
  guest_total_kobo: string;
  currency_code: string;
};

export type Booking = {
  booking_id: string;
  booking_number: number;
  property_id: string | null;
  property_name: string;
  guest_name?: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  base_amount_kobo: string;
  guest_total_kobo?: string;
  currency_code: string;
  status: string;
  payment_status?: string;
  payment_enabled?: boolean;
  cancellation_reason?: string | null;
};

export type BookingDetail = {
  contract: 1;
  booking: Booking & {
    nightly_rate_kobo: string | null;
    guest_service_fee_kobo: string;
    tax_kobo: string;
    guest_total_kobo: string;
    created_at: string;
    updated_at: string;
  };
  permissions: { can_cancel: boolean; can_dispute: boolean };
  timeline: {
    id: string;
    event_type: 'created' | 'status_changed';
    from_status: string | null;
    to_status: string;
    actor_label: 'You' | 'Host' | 'Fuhara support' | 'Fuhara';
    occurred_at: string;
  }[];
  stay: {
    check_in_time: string;
    check_out_time: string;
    house_rules: string;
    cancellation_policy: string;
    area: string | null;
    city: string;
    state: string;
    address: string | null;
    directions_available: boolean;
    host_first_name: string | null;
  };
};

export type HostBookingDetail = {
  booking_id: string;
  booking_number: number;
  property_id: string;
  property_name: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  base_amount_kobo: string;
  currency_code: string;
  status: string;
  cancellation_reason: string | null;
  created_at: string;
  status_updated_at: string | null;
  payment_status: string;
  host_payout_kobo: string;
  payment_collection_available: boolean;
};

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
};

export type Account = { user_id: string; status: string; is_host: boolean };
export type HostProfile = {
  user_id: string;
  kyc_status: string;
  rejection_reason: string | null;
};

export type HostSummary = {
  listing_counts: Record<string, number>;
  booking_counts: Record<string, number>;
  upcoming_stays: number;
  expected_host_kobo: string;
  payout_eligible_kobo: string;
  payout_blocked_kobo?: string;
  paid_out_kobo: string;
  held_payout_kobo: string;
  payout_readiness?: { payout_ready: boolean; blockers: string[] };
};

export type HostListingSummary = {
  id: string;
  title: string;
  status: string;
  rejection_reason: string | null;
  updated_at?: string;
};

export type HostDashboard = {
  summary: HostSummary;
  listings: HostListingSummary[];
  requests: { items: Booking[]; has_more: boolean };
  stays: { items: Booking[]; has_more: boolean };
};

export type SupportTicket = {
  id: string;
  ticket_number: number;
  category: string;
  subject: string;
  status: string;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PayoutReadiness = {
  payout_ready: boolean;
  blockers: string[];
  legal_identity?: {
    legal_name?: string;
    version?: number;
    source_type?: string;
    synthetic?: boolean;
  } | null;
  payout_account?: {
    bank_name?: string | null;
    account_number_masked?: string | null;
    resolved_account_name?: string | null;
    verification_status?: string | null;
    name_match_result?: string | null;
  } | null;
};

export type HostContext = {
  profile: Profile | null;
  account: Account | null;
  host: HostProfile | null;
  kyc: HostKycStatus | null;
};

export type PropertyRouteData = CatalogProperty;
