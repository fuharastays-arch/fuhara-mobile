# Architecture

## Boundaries

Independent npm-workspace repository; no dependency on the Admin app, Vercel project, deployment or .vercel directory. `apps/web` is Next.js App Router with React/TypeScript. `packages/core` holds platform-independent projection types and validation rules. `packages/design` holds brand tokens available as CSS and TypeScript. Web components remain in the web app; future React Native UI can reuse domain types, validation and tokens without importing Next.js or DOM components.

Supabase browser and server adapters live under apps/web/src/lib/supabase. The server adapter is server-only. Browser environment variables contain only publishable/anon credentials; secret keys are rejected. No administrative client exists. SSR uses a separate fuhara-product-auth cookie name, leaving the Admin session cookie alone. Sign-out scope is local so it does not intentionally revoke other device/Admin sessions.

The proxy refreshes sessions on account/host/auth paths and emits private no-store headers. Every private page/action independently verifies Auth identity; a layout alone is not used for authorization. Protected account reads are uncached and use explicit self-ID filters in addition to RLS. Next Server Actions enforce same-origin mutations. Email callbacks use a configured origin and allowlisted destinations, not Host or arbitrary user URLs. Auth provider rate limiting remains Supabase-managed; assess CAPTCHA and SMTP delivery in staging before launch.

## Routes

| Route                                       | Purpose                                                               |
| ------------------------------------------- | --------------------------------------------------------------------- |
| /                                           | Editorial hospitality home, destination discovery entry               |
| /properties?destination=                    | Searchable destination shell with honest unavailable state            |
| /properties/[id]                            | UUID detail route boundary; 404 until approved public contract exists |
| /host                                       | Public hosting introduction                                           |
| /host/onboarding                            | Authenticated profile/verification progress shell                     |
| /account                                    | Authenticated account overview                                        |
| /account/profile                            | Self profile completion/editing and initial non-host account creation |
| /auth/sign-in, /auth/sign-up                | Shared guest/host identity                                            |
| /auth/forgot-password, /auth/reset-password | Recovery request and authenticated password update                    |
| /auth/callback                              | PKCE code exchange, allowlisted redirect                              |

Email signup does not write a guest/host role into auth metadata. Confirm email then complete profile. Existing hosts sign in normally; hosting eligibility requires active user_accounts, is_host=true and verified host_profiles. Onboarding does not submit an application yet.

## Mobile path

Use the same Supabase project and RLS with a native secure-storage auth adapter. Keep API contracts independent from Next Server Actions. Future catalog/booking contracts should be reusable RPCs or versioned service interfaces. Add mobile deep links to the existing Auth allowlist only after mobile development begins. Do not copy browser cookie handling into native code.

## Design

Preserves the existing Fuhara teal (#0EA39A), deep green and supplied wordmark. Uses darker teal for legible text/buttons, warm cream, editorial serif headings and spacious layouts. Motto: **Verified stays. Effortless comfort.** Existing living-room/sunset imagery was copied read-only from Admin assets; confirm original image usage rights before a public launch. No invented listing counts, prices, testimonials, property images or review scores.

Accessible form labels, pending states, status announcements, keyboard focus, skip navigation, reduced-motion handling and responsive navigation are included. System fonts avoid build-time remote font downloads.

## Technical references

- https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/guides/data-security

The client setup follows Supabase SSR guidance; server authorization lives at data/action boundaries as recommended by Next.js. Implementation uses getUser for fresh identity checks.
