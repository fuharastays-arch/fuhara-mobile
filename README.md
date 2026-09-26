# Fuhara guest/host product — Phase 2

**Verified stays. Effortless comfort.**

Separate guest/host web application, designed to share domain contracts and brand tokens with a future mobile app. This repository does not alter or deploy the existing Fuhara Admin Dashboard.

## Run locally

Requires Node 22.13+ (validated with Node 24) and npm.

```powershell
npm ci
Copy-Item apps/web/.env.example apps/web/.env.local
# Set the existing project's Supabase URL and publishable/anon key in that file.
# Keep NEXT_PUBLIC_APP_URL=http://localhost:3001 for local development.
npm run dev
```

Open http://localhost:3001. Port 3001 is separate from a typical Admin development server on 3000. On this machine a gitignored `.env.local` has already been prepared from the existing Admin project's public Supabase configuration; do not overwrite it unnecessarily. No private/service-role credentials were copied. Without Supabase configuration the public shell still renders and auth submission is disabled.

```powershell
npm test
npm run typecheck
npm run build
npm start
# In another terminal while the app is running:
npm run test:smoke
```

## Created

- `apps/web`: Next.js/React/TypeScript web app; responsive home, discovery, listing detail boundary, hosting introduction/onboarding and account/profile pages.
- `packages/core`: portable validation, role eligibility and source-confirmed data projections.
- `packages/design`: shared CSS/TypeScript brand tokens. Components are in `apps/web/src/components`.
- Guest/host email signup, sign-in, confirmation callback, password recovery/update, local sign-out and server-verified sessions.
- Self-service profile completion and editing using existing RLS. New consumer accounts are always non-host. Existing host status is read from the existing tables.
- Explicit unavailable/empty/error states and form submission feedback; no fake live inventory.
- Independent Git repository and lockfile. No remote or hosting project is configured.

## Auth integration before testing email delivery

Add the exact product callback destinations to Supabase's existing Redirect URLs allowlist, preserving every Admin entry and the Admin Site URL. For this local app the callbacks requested are:

```text
http://localhost:3001/auth/callback?next=%2Faccount
http://localhost:3001/auth/callback?next=%2Faccount%2Fprofile
http://localhost:3001/auth/callback?next=%2Fhost%2Fonboarding
http://localhost:3001/auth/callback?next=/auth/reset-password
```

Supabase matching may be configured with a local-only `http://localhost:3001/auth/callback**` pattern to cover query variations; use tightly scoped approved URLs in production. Set NEXT_PUBLIC_APP_URL to the separate product origin at build/deploy time. Do not replace shared email templates or change Admin redirect behavior. Confirm current shared templates honor the requested redirect URL. Confirmation/reset PKCE links should be completed in the browser that requested them. Real email delivery and authenticated database writes must be validated with an approved test account in staging before launch.

No Supabase Auth settings were changed in this task. No real user was created, email sent, host application submitted, or booking made during verification.

## Backend boundaries

Discovery and property detail now use the anonymous `product_catalog_v1` RPC: approved stays from active, verified hosts, NGN nightly rates, real cover/gallery images and amenities. Search supports city/area, capacity, stay type, maximum nightly price, sorting and pagination. Missing/failed backend access is distinct from an empty result. No fake inventory is supplied to the app.

The candidate migration has **not been applied**. Until it is deployed and reachable, the normal local preview displays catalog unavailable. The test suite uses an isolated loopback fixture API to exercise populated pages; it never seeds the shared Supabase database.

Date selection provides an integer-kobo nightly subtotal only. Availability is unconfirmed; booking/payment controls remain disabled. No bookings, finance, account or Admin behavior was changed. Host onboarding still reflects existing KYC progress without a new submission workflow.

- [Data-contract map](docs/DATA-CONTRACTS.md)
- [Final Phase 2 backend contract](docs/PHASE-2-CONTRACT.md)
- [Migration proposals — none applied](docs/MIGRATION-PROPOSALS.md)
- [Architecture and mobile path](docs/ARCHITECTURE.md)
- [Verification report](docs/VERIFICATION.md)

## Next milestone

First rehearse the catalog migration and Admin regression matrix in staging, then enable real discovery. The next product milestone is authoritative availability, server-priced quotes and idempotent booking requests with overlap protection. Validate the auth/profile flow in staging with guest, verified-host and suspended-account fixtures. Host application submission remains a separate workflow.

## Phase 2 tests

`npm run test:catalog-routes` builds an isolated production test app on port 3012 and starts a mock RPC server on 127.0.0.1:4011. It checks real routes against successful, empty, failed and malformed API responses. The fixture is clearly labelled TEST FIXTURE and is never used in normal development or production. Both servers are stopped afterward. Set PLAYWRIGHT_MODULE to an installed Playwright module URL and optionally CHROME_PATH to include browser interaction and desktop/mobile checks; otherwise only HTTP checks run. Browser screenshots are test evidence, not live inventory.

SQL role tests: `psql -v ON_ERROR_STOP=1 -d fuhara_catalog_test -f tests/sql/catalog.sql` against an empty disposable database only. A database-name guard prevents accidental use elsewhere. The CI workflow supplies PostgreSQL 17. No PostgreSQL runtime is bundled in the app.

Before public launch: complete those integration checks, review shared Supabase SMTP/redirect/CAPTCHA settings, confirm brand asset rights, and supply privacy/terms content. A future deployment must use a new hosting project, never the Admin project.
