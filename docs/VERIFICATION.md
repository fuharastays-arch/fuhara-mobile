# Phase 2 verification and handoff

Validated on 26 September 2026, Windows, Node 24.19.0. Based on Phase 1 commit `37bb5d1` in a separate local product repository. Admin source and production database were not modified.

## Validation results

| Check                                            | Result                                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Production build                                 | PASS — all routes compile; catalog/detail render dynamically                                    |
| TypeScript                                       | PASS                                                                                            |
| Unit/workflow tests                              | PASS — 25                                                                                       |
| Production route smoke tests                     | PASS — 14                                                                                       |
| Isolated catalog integration checks              | PASS — 12, including browser checks                                                             |
| Formatting and whitespace checks                 | PASS                                                                                            |
| Browser layouts                                  | PASS — catalog/detail at 1440px and 390px, no horizontal overflow; screenshots inspected        |
| Date interface                                   | PASS — nightly subtotal, occupancy errors, disabled booking                                     |
| Missing property responses                       | PASS — actual HTTP 404 for absent and malformed IDs                                             |
| Failed images                                    | PASS — fallback also handles failure before React hydration                                     |
| PostgreSQL migration execution / SQL role matrix | NOT RUN — no PostgreSQL/Docker runtime; embedded-engine download blocked by network permissions |
| Real Supabase staging and Admin regression       | NOT RUN — no confirmed staging environment or live schema export                                |
| Production migration / deployment                | NOT APPLIED / NOT DEPLOYED                                                                      |

The integration suite builds a separate production test app with an isolated loopback RPC fixture. It checks populated pages, filter argument transport, empty/error/malformed results, pagination, detail gallery and amenities, 404s and absence of forwarded staff cookies. Browser-only images are supplied by a local test route and clearly labelled TEST FIXTURE. These are not real inventory and never appear in the normal preview. SQL behavior has a prepared PostgreSQL role test suite and CI job, but its results remain unverified until that suite runs.

## Preview

[Local product preview](http://localhost:3001) · [Discovery](http://localhost:3001/properties)

The normal preview uses the existing public Supabase configuration. The catalog currently shows its unavailable state because the new RPC is not available/reachable here. No fallback inventory is injected. Run `npm start` from this repo to restart the production preview, or `npm run dev` for development. Do not run both on port 3001.

## Schema decisions and application steps

See [final Phase 2 contract](PHASE-2-CONTRACT.md) and [exact migration rollout](MIGRATION-PROPOSALS.md).

- Add only property_images, property_amenities and product_catalog_v1 via candidate 019_product_catalog.sql.
- Publish only approved properties with active host accounts, host capability and verified KYC. Public projection excludes owner IDs, street address and staff/review fields.
- Preserve existing cover_image_url and integer nightly_rate_kobo. NGN only for this milestone; decimal strings on the wire, validated integer kobo internally and exact display formatting.
- No booking/availability writes. The date planner shows only a nightly subtotal; fees/taxes and availability remain unconfirmed.
- Keep every existing core table and Admin permission unchanged. New supplemental content is staff-managed under existing properties.view/properties.manage permission checks.
- Before production: reconcile migration numbering and schema, run disposable SQL tests, apply candidate migration to safe staging, verify RPC/RLS and Admin workflows, then obtain production authorization. Nothing is currently applied.

## Files changed

- `packages/core/src/catalog.ts`, `packages/core/package.json`: reusable catalog validation, filters, images, exact money and stay estimates.
- `apps/web/src/lib/catalog.ts`: anonymous Supabase RPC adapter, timeout, no-store and safe failures.
- `apps/web/src/app/properties/(browse)/page.tsx`, `loading.tsx`: replaces the old properties/page.tsx shell with catalog/filter/pagination/loading UI.
- `apps/web/src/app/properties/[id]/page.tsx`, `properties/error.tsx`: eligible detail rendering, gallery, amenities, missing/error handling.
- `apps/web/src/components/catalog.tsx`, `property-image.tsx`, `stay-planner.tsx`: cards, empty/error states, robust images and date planner.
- `apps/web/src/app/globals.css`, `page.tsx`: responsive catalog styles and updated discovery wording. Brand line remains “Verified stays. Effortless comfort.”
- `apps/web/next.config.ts`, `tsconfig.json`, root `package.json`, `.gitignore`, `.prettierignore`: isolated test-build support; no added runtime dependency.
- `supabase/migrations/019_product_catalog.sql`, `supabase/preflight.sql`: candidate migration and read-only preflight.
- `tests/catalog.test.ts`, `catalog-fixture.mjs`, `catalog-routes.mjs`, `smoke.mjs`, `tests/sql/*`, `.github/workflows/ci.yml`: unit, route, browser and prepared SQL validation.
- `README.md`, `docs/DATA-CONTRACTS.md`, `MIGRATION-PROPOSALS.md`, `PHASE-2-CONTRACT.md`, `ARCHITECTURE.md`, `VERIFICATION.md`: setup, contract, rollout and handoff.
- `docs/catalog-1440.png`, `catalog-390.png`, `detail-1440.png`, `detail-390.png`: clearly labelled fixture-only visual evidence.

## Next milestone

Staging validation and catalog rollout first. Then authoritative availability and booking requests: property-local date rules, blocked nights, server-priced quotes, overlap locks, idempotency, guest-safe booking projections, financial snapshots and payment/cancellation rules. Existing auth/email/profile flows also require staging validation before public launch.
