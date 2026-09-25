# Phase 1 verification

Validated locally on 25 September 2026, Windows, Node 24.19.0.

| Check                                | Result                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Production build                     | PASS — all routes compiled and server/static rendering completed              |
| TypeScript strict check              | PASS                                                                          |
| Unit/workflow tests                  | PASS — 19 tests                                                               |
| Running production-server HTTP tests | PASS — 14 tests                                                               |
| Package install audit                | 0 reported vulnerabilities in 47 audited packages at install time             |
| Browser inspection                   | Home at desktop width; home, discovery and sign-in at 390px; sign-in at 320px |
| Browser interactions                 | Destination search navigates to Abuja shell; My account redirects to sign-in  |

Tests cover unsafe redirect targets; signup and profile validation; non-active/unverified host eligibility; missing/partial/unsafe environment configuration; non-host account creation; unconfirmed and suspended profile-write denial; partial setup recovery; no overwriting existing host controls; public pages; private page redirects; private no-store headers; unexposed property detail 404; unknown auth route 404; callback redirect safety and search escaping.

A global loading boundary initially caused streamed 200 responses before redirect/404 decisions. It was removed, and the production route tests now verify actual 307/404 statuses. Form pending states remain available.

## Not validated against production

- No real signup, email confirmation, password-reset delivery, login or profile write was performed.
- No authenticated host/guest fixture was available for an end-to-end RLS test.
- Schema mapping is against inspected migration source, not a fresh live schema export.
- Public catalog and host application migrations are proposals only.
- CI workflow is supplied but has not run on a remote repository.

Use a staging project/branch and approved test accounts to verify email redirects, profile setup retries, profile isolation, suspended-account enforcement, host status and all staff regression checks before public launch. Preserve the Admin Auth Site URL and redirect entries when adding product callback destinations.

## Isolation

The Admin source and supplied brand assets were read only. The new app is an independent local Git repository with its own dependencies and port 3001. Only two public Supabase environment values were copied into a gitignored local environment file. No private keys, Admin deployment configuration, migration execution, production Auth settings or staff records were changed.
