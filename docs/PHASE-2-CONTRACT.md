> Current rollout status: see [Phase 2 production closeout](PHASE-2-RELEASE.md). The pre-rollout status statements below are historical.

# Phase 2 backend contract — finalized for implementation, not deployed

Baseline: product commit `37bb5d1`, DATA-CONTRACTS.md and MIGRATION-PROPOSALS.md; Admin source migrations 003, 005, 006, 007, 016 and 017. Production has not been introspected and no staging environment is identified. Deployment requires the preflight and staging checks in MIGRATION-PROPOSALS.md.

## Public discovery

`public.product_catalog_v1(p_destination text='', p_guests integer=1, p_type text='', p_max_rate bigint=null, p_sort text='newest', p_page integer=1, p_id uuid=null)` returns JSON `{items: CatalogProperty[], has_more: boolean}`. Page size is 12, page range 1–1000. Invalid arguments raise SQLSTATE 22023. Search is a literal, case-insensitive substring of city or area (80 characters maximum); SQL wildcards are not interpreted. Sort is newest, price_low or price_high with UUID tie-breaker. Optional ID uses the identical publication predicate. Missing or ineligible IDs return zero items. No exact inventory count is exposed.

A published row requires properties.status=approved, user_accounts.status=active, is_host=true and host_profiles.kyc_status=verified. Phase 2 supports NGN rates only, between 0 and Number.MAX_SAFE_INTEGER kobo. Other currencies and unrepresentable rates are withheld instead of mispriced. Zero is displayed as a zero rate, never assumed free booking. Price filters use integer kobo; UI accepts whole naira. Current approval governs all cover/gallery/amenity content; only authorized staff can edit supplemental media and amenities until a moderated host editing workflow exists.

Allowlist: id, title, description, property_type, area, city, state, country, bedrooms, bathrooms, max_guests, nightly_rate_kobo (decimal string on the wire), currency_code, cover_image_url, images [{id,url,alt_text,position}], amenities [{code,label}]. No address_line, host_id, profile data, email, staff fields, rejection reasons, booking data, timestamps or inferred ratings are returned. The app validates the response and safe money bounds before rendering.

## Minimal additive schema

One candidate migration `019_product_catalog.sql` (confirm number against current Admin history before application):

- `public.property_images`: UUID id, property_id FK→properties ON DELETE CASCADE, HTTPS url, alt_text, position 0–19 unique per property. Maximum 20 images by slot constraint. Existing cover_image_url remains the cover; if absent/invalid, first gallery image is used. No synthetic property photography or storage bucket changes.
- `public.property_amenities`: property_id FK, code (stable lowercase identifier), label (1–80 characters); composite primary key. No global taxonomy or data backfill is assumed. RPC caps displayed amenities at 50, alphabetically.
- Both tables enable RLS, revoke implicit API grants and grant authenticated CRUD guarded by existing properties.view/properties.manage staff permission checks. Owners have no new write capabilities. Supplemental writes remain a staff/database ingestion step; the Admin UI is unchanged.
- `public.product_catalog_v1` is a STABLE SECURITY DEFINER read function with empty search_path, fully qualified relations, no dynamic SQL and explicit anon/authenticated EXECUTE grants. Existing table policies/grants/triggers remain untouched. The public schema entry point avoids requiring new exposed-schema configuration; this is the deliberate revision of Phase 1's dedicated-schema proposal. Table access stays restricted, and the RPC is the only anonymous catalog interface.

The web client calls this RPC using only the publishable/anon key, never a staff session or service credential. Requests are no-store, bounded by a timeout. Missing RPC, malformed response, network and server failures show an unavailable state, never an empty catalog. A successful zero-row detail is 404; a backend failure is an explicit unavailable page. Detail pages opt out of indexing during this foundation.

## Availability / booking boundary

There is no confirmed availability source. The date interface validates real calendar dates, future check-in, check-out after check-in, 1–90 nights and occupancy. It computes only a safe-integer nightly subtotal, with availability=`unconfirmed` and booking=`unavailable`. Dates never filter catalog inventory, create bookings, reserve nights or trigger payments. Fees/taxes are unknown and excluded, not treated as zero. Booking control stays disabled. Existing bookings and booking_financials are unchanged.

Next milestone: transactional availability and quote contract with property-local timezone, blocked nights, booking overlap locks, idempotency, authoritative fees, cancellation rules and guest-safe booking projections; validate the complete flow in staging before enabling reservation/payment.

## Compatibility and release

profiles, user_accounts, host_profiles, properties and bookings keep their columns, policies, ownership semantics and Admin behavior. New indexes are limited to new-table keys. Existing status/host indexes support discovery initially; obtain EXPLAIN on staging before adding indexes. Real production content remains unpublished to this app until the migration is reviewed, deployed and verified. SQL role tests target an isolated PostgreSQL database with source-derived baseline fixtures; this does not replace a real Supabase staging rehearsal or full Admin regression. See VERIFICATION.md for what actually ran.

Function security follows [Supabase's database-function guidance](https://supabase.com/docs/guides/database/functions).
