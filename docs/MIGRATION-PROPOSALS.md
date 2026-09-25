# Proposed backend work — NOT APPLIED

No SQL migrations are executed or assigned migration numbers in this repository. Coordinate numbering with the Admin repository after its 018 migration. Review against a current schema export and test on a staging branch before considering production. Preserve all existing staff policies, Auth Site URL, email templates and admin redirect URLs.

## 1. Public catalog (needed for live discovery)

Design a narrowly scoped catalog endpoint/RPC in a dedicated exposed product schema, returning only the PropertySummary allowlist from DATA-CONTRACTS.md. Read approved properties only, additionally requiring an active host account and verified host profile. Do not expose street addresses, owner IDs, staff review metadata or rejection reasons. A proposed security-definer RPC must use a fixed empty search_path, fully qualified names, no caller-controlled SQL, bounded pagination and explicit execute grants for anon/authenticated. Review these semantics before implementing it. Avoid broadly granting public SELECT on properties or changing staff policies to make a UI work.

Acceptance: anonymous and ordinary guest see only eligible published projections; suspended/rejected/pending properties and inactive/unverified hosts are excluded; cross-host IDs and sensitive fields never appear; sorting/search are bounded and deterministic; staff dashboard sees exactly what it did before. Add indexes only after query planning.

## 2. Host applications (needed for submission, not the current shell)

Propose a separate host_applications table rather than overloading privileged host_profiles. Confirm required business/KYC inputs, retention and storage policy first. Applicant owns a draft/application; they must never write reviewed_by, verification result or user_accounts.is_host. Approved staff workflow can create host_profiles and change host capability transactionally with audit events. Keep identity documents in private storage with tightly scoped upload/download rules. No document upload exists in this foundation.

Acceptance: active users can access only their application; suspended users cannot submit; submission is idempotent; only authorized staff approve/reject; applicants cannot self-verify or self-promote; existing Admin host views and audit triggers continue working.

## 3. Consumer account hardening (recommended before public launch)

Existing profile UPDATE RLS only checks ownership, not active account status. This app blocks non-active updates, but direct clients can still call the Data API under current policies. Review a database-level active-account predicate while preserving legitimate initial setup and staff access. Also review verified Auth email binding and an idempotent transaction for profile + initial account creation. Do not replace existing policies without a compatibility test matrix.

## 4. Guest bookings (later booking milestone)

Design an own-booking read projection using guest_id = auth.uid(), excluding admin_note and staff-only financial/review fields. Creation must be a controlled transactional service/RPC with current prices, availability locking, idempotency, financial snapshots and payment state. No client-priced direct inserts. Do not equate RLS-hidden rows with an empty trip list.

## Release process

Export production schema read-only → compare with source migrations → test proposed changes in staging → run anon/guest/host/staff role matrix and Admin regression suite → review forward and rollback plans → obtain approval to apply. Enable live product features only after the corresponding contract is deployed and verified. None of these proposals is necessary to run the current shell and existing-profile auth flow locally.
