# Phase 2 production migration and header closeout

Date: 26 September 2026. Product baseline: `854cb6c`. Production migration succeeded; the guest/host web app has not been publicly deployed.

## Header

Authenticated guests and hosts see **Account** linking to `/account`, where the existing profile, hosting and sign-out controls remain available. Anonymous users see **Sign in**. While the initial session is unresolved, the header shows Account rather than an incorrect signed-out prompt. Existing classes, navigation, premium styling and responsive layout are unchanged.

The header listens to initial-session, sign-in, refresh and sign-out events and unsubscribes on cleanup. It resubscribes after pathname changes because server-action sign-in/sign-out updates cookies without emitting a browser-client auth event. A full form-to-account browser regression caught and verified this case.

## Migration evidence

- Production: **Fuhara Stays**, `yqugrhlbqaldvjkdktgg`.
- Staging: **Fuhara Phase 2 Staging**, `xhneambzjwqqwhtcnytq`.
- The repository migration and saved staging-validation migration were byte-for-byte identical (SHA-256): `ea7aba0577dfeca16d5273d7a658ce5811c706779cabb2b26595ee734f05c462`.
- Executed the unchanged `019_product_catalog.sql` through production's Supabase SQL editor. Result: **Success. No rows returned**. The script contains its own BEGIN/COMMIT transaction.
- No seed, test identities, test listings, data backfill, or staging role-matrix scripts were executed against production.
- Postflight: both new tables exist, RLS enabled, four media policies, catalog function owned by `postgres`, SECURITY DEFINER with empty search path. Both new tables contain **zero rows**.
- Production has no CLI migration-history table (confirmed in the staging audit). This is an SQL-editor rollout verified by object inspection, not a claim that the CLI ledger contains version 019.
- The migration's original “NOT APPLIED” source comment is intentionally preserved to retain the exact tested bytes. This release record supersedes that historical status.

## Production preservation checks

| Check                                     | Before and after                   |
| ----------------------------------------- | ---------------------------------- |
| Properties / bookings / profiles / staff  | 1 / 3 / 1 / 5                      |
| Existing public column definitions MD5    | `9d8c5ab4750cf3f732c00917311e16ba` |
| Existing public/private RLS policies MD5  | `592c5332d356298d61aa6a274e09bb99` |
| Existing functions, owners and grants MD5 | `9936eea519a0fa49628aac59289ab23c` |
| Existing property row content MD5         | `8d9f5b4d93ff2cc0a8eeea73f0454353` |
| Existing property table grants MD5        | `d107081966dd729b1c2347a16c52af0b` |
| Listings titled STAGING - ...             | 0                                  |

Read-only production SQL role checks passed: anon catalog returns one existing eligible property; private fields excluded; direct anon property rows hidden and supplemental tables denied; invalid filters rejected; staging property ID absent; ordinary authenticated identity cannot read private property/media data or gain staff permission; active Admin retains property view/manage permission, property visibility, supplemental-table reads and audit access. These used SET ROLE and transaction-local claims, not newly created Auth users. The transaction ended with ROLLBACK.

Focused regression against the **existing deployed production Admin Dashboard** passed: Overview (three bookings), Properties (one approved property), property detail (rate, capacity, host, approval/reviewer information and review control), and Audit & Security (five events). No permission/RLS errors appeared. This was a read-only UI regression; the existing approved property was not suspended or otherwise mutated just to test controls. No Admin deployment or environment change was made.

## Validation

| Check                                              | Result                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Product production build                           | PASS                                                                                                                           |
| TypeScript / formatting / whitespace               | PASS                                                                                                                           |
| Unit/workflow/component tests                      | PASS — 28                                                                                                                      |
| Production route smoke tests                       | PASS — 14                                                                                                                      |
| Catalog integration checks including browser tests | PASS — 15                                                                                                                      |
| Browser auth transitions                           | PASS — actual sign-in form, client navigation, reload and sign-out against isolated loopback Auth fixture                      |
| Authenticated header widths                        | PASS — 1440, 390 and 320px; no horizontal overflow                                                                             |
| Catalog/detail browser checks                      | PASS — desktop/mobile layout, nightly subtotal, guest validation, disabled booking and broken-image fallback                   |
| Disposable catalog SQL suite                       | PASS — complete SQL script in isolated in-memory PGlite; only the database-name guard adapted for PGlite's fixed database name |
| Admin local tests                                  | PASS — 30, including database staff safeguards                                                                                 |
| Production DB/RLS smoke and deployed Admin reads   | PASS                                                                                                                           |

The route smoke suite now runs inside the isolated integration server so its callback origin matches the test URL. An initial run against a secondary local port correctly failed the origin assertion because the build was configured for port 3001; the matching-origin suite passed.

The original guest and Admin staging flows were validated in the referenced MVP Technical Audit. In this closeout, the real staging catalog and gallery/amenities loaded (one detail request needed a retry). Signed-out mobile styling was inspected. The updated live staging authenticated-header check still awaits a user sign-in; the automated authenticated browser regression passed against an isolated fixture. The in-app browser crashed when opening its native date picker, so planner interaction was verified successfully by the automated Chromium suite instead.

## Release decision

**Production database and existing Admin are ready for controlled guest/host deployment verification. Hold unrestricted public launch pending the following checks:**

1. Review the sole existing production listing: its description identifies a controlled property-approval test and its host is a test account. It predates this migration and was not copied from staging. The catalog now exposes it under the approved/active/verified rules. Publishable inventory needs a deliberate content decision.
2. Complete a real guest/host session check of the final header build. The fixture browser tests cover the implementation, but do not replace a final hosted Auth check.
3. Configure and verify the chosen production app origin and Supabase email callback URLs on a controlled deployment. No public guest/host deployment, redirect-setting change, email, reservation or payment was performed here.

Availability remains unconfirmed and booking/payment remain disabled as required for Phase 2. Supplemental media remains staff-controlled at the database layer; the existing Admin UI is unchanged.
