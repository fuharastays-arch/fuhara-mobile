> Current rollout status: see [Phase 2 production closeout](PHASE-2-RELEASE.md). The pre-rollout status statements below are historical.

# Backend changes — prepared, NOT APPLIED

## Final Phase 2 decision

Read [PHASE-2-CONTRACT.md](PHASE-2-CONTRACT.md) first. The implementation contains one additive candidate: `supabase/migrations/019_product_catalog.sql`. Number 019 follows the reported Admin 018 rollout, but must be reconciled with the current shared migration history before deployment.

It creates only property_images, property_amenities, their staff-only RLS policies and the public.product_catalog_v1 read RPC. It does not alter existing profiles, user_accounts, host_profiles, properties, bookings, finance tables, staff policies, triggers, Auth configuration or storage policies. No production or staging migration was applied. No staging environment was identified.

The Phase 1 proposal for a dedicated exposed product schema is replaced by a versioned public RPC: it avoids a separate API schema configuration change while maintaining the same narrow allowlist. The web never selects the private properties table or forwards a staff session to the RPC.

## Exactly what must be applied

1. Obtain a current **read-only schema export** and migration history from the shared Supabase project. Verify baseline columns/types, `private.has_staff_permission(text)`, publication status values, table ownership, existing grants and RLS. Run `supabase/preflight.sql` read-only to help review. Confirm candidate 019 is unused; renumber consistently if necessary.
2. Use a disposable PostgreSQL database to run `tests/sql/catalog.sql` with `psql -v ON_ERROR_STOP=1 -d fuhara_catalog_test -f tests/sql/catalog.sql`. CI includes a PostgreSQL 17 service for this. These tests use the original Admin 006 migration plus minimal dependency fixtures; they do not prove compatibility with every live policy. This environment could not run them: PostgreSQL/Docker are absent and downloading an embedded engine was denied.
3. Create/identify a safe Supabase staging branch from the current schema. Apply **only** the reviewed `019_product_catalog.sql` to staging using the normal shared migration process, as the trusted migration owner (normally postgres). Do not use a product/guest role. Do not run the fixture SQL against staging with real data.
4. Verify anon/guest/owner/staff catalog behavior in staging, including pending/rejected/suspended properties; disabled/suspended accounts; unverified hosts; media writes; direct table denial; ordering, filters and pagination. Revoke approval or host eligibility and ensure catalog/detail immediately disappear. Confirm PostgREST RPC discovery after schema reload. Run EXPLAIN for representative inventory size.
5. Run existing Admin property review, host/KYC, bookings, profile and staff regression checks against staging. Ensure staff edits and audit events are unchanged. Inspect public description/media content, since approval authorizes publication of those fields.
6. After staging passes and production deployment is authorized, apply the **same migration** once to production. No seeds, data replacements, backfills, Auth settings, storage bucket policies or service keys are required. Existing cover_image_url values work immediately for eligible rows; supplemental images and amenities appear only when authorized staff ingest real content.
7. Configure/build the separate product with its publishable/anon Supabase values and verify the live catalog. Leave the Admin hosting project untouched. Until then, the normal preview honestly shows catalog unavailable if the RPC cannot be reached.

## Rollback / disable

First roll the product app back to Phase 1 or disable its catalog entry points. Revoke EXECUTE on `public.product_catalog_v1(text,integer,text,bigint,text,integer,uuid)` from anon and authenticated and notify PostgREST to reload its schema. Keep the new tables and their content for investigation; no destructive drop is needed to stop publication. Existing Admin operations are unaffected by this additive rollback. Any later table removal requires a separate data-retention review.

## Deferred contracts

- Host applications: separate applicant-owned drafts and a staff-controlled approval workflow; no self-verification or is_host mutation. Identity documents require private storage and retention rules.
- Consumer hardening: existing profile UPDATE RLS checks ownership, not active-account status. App checks remain in place; database hardening needs a separate compatibility matrix, verified-email binding and recoverable initial setup.
- Availability/booking: own-guest projections excluding admin notes; property-local dates; blocked nights; authoritative quotes; overlap locking; idempotency; payment and finance snapshots. No client-priced direct booking inserts. No booking/availability migration is included in Phase 2 discovery.
