# Fuhara product foundation

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

Live public listings and booking reads are not authorized by inspected existing policies. Discovery therefore displays a coming-soon state and property details return 404. Host onboarding shows genuine existing profile/KYC progress but cannot submit an application. This is deliberate Phase 1 scope, not a finished marketplace.

- [Data-contract map](docs/DATA-CONTRACTS.md)
- [Migration proposals — none applied](docs/MIGRATION-PROPOSALS.md)
- [Architecture and mobile path](docs/ARCHITECTURE.md)
- [Verification report](docs/VERIFICATION.md)

## Next milestone

Review a current schema export, approve and test a narrow public catalog contract, then build real property cards/details, search/filter/pagination and verified-host publication gating. In parallel with that milestone, validate this auth/profile flow on staging with guest, verified host and suspended-account fixtures. Add host application submission only after its separate privileged workflow is reviewed.

Before public launch: complete those integration checks, review shared Supabase SMTP/redirect/CAPTCHA settings, confirm brand asset rights, and supply privacy/terms content. A future deployment must use a new hosting project, never the Admin project.
