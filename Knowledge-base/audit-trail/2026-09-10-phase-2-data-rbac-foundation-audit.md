# Phase 2 data/RBAC foundation implementation audit — 10 September 2026

## Scope

This change implements the provider-neutral Phase 2 data and authorization slice for the linked
synthetic non-production project. Consent persistence and capture remain the only Phase 2 item
deferred to post-development.

## Implemented

- Added backend-provisioned psychiatrist records with immediate trust at creation. The operational
  `is_active` flag controls patient discovery and bookability; no pending/approved workflow exists.
- Added appointment `no_show_party` and `rescheduled_from_id` facts, with no-show consistency and
  one-reschedule-per-original constraints.
- Added protected, versioned `session_notes` with psychiatrist authorship, release state, correction
  linkage, release immutability for application roles, and timestamp/index support.
- Added service-role-only audited functions for note creation, release, and relationship-aware reads.
- Updated clinician, availability, appointment, and appointment-projection policies to use
  `is_active` where clinician discovery or bookability is involved.
- Restricted the legacy demo profile-provisioning function to the service role.
- Added `scripts/test-phase2-db.mjs` and the `test:db:phase2` package command for RLS, note-release,
  latest-note-only patient access, correction, audit, and no-show constraint checks.

The test was subsequently expanded to the complete three-role table/action matrix. It now verifies
profile ownership and role immutability, active-clinician discovery, slot and appointment relationship
boundaries, direct CRUD denial on all protected tables, service-role-only RPCs, anonymous denial, and
audit insert/update/delete denial for patient, psychiatrist, and admin. The fresh live run passed with
isolated synthetic fixtures.

The Phase 2 implementation was applied through forward-only migrations. The live test found and
corrected two PL/pgSQL identifier/type issues, and the final closure work added the patient latest-note
rule, admin audit-metadata read access, a single admin audit policy, and the correction-chain index:

- `20260910102250_phase2_data_rbac_foundation.sql`
- `20260910125243_phase2_note_version_fix.sql`
- `20260910125351_phase2_note_read_qualification.sql`
- `20260910125444_phase2_note_audit_outcome_cast.sql`
- `20260910130030_remove_psychiatrist_approval_state.sql`
- `20260910134651_phase2_patient_latest_note_and_admin_audit_read.sql`
- `20260910135532_phase2_audit_policy_and_note_correction_index.sql`

## Provisioning-model correction

The owner clarified that psychiatrists are added only by developers or authorized admins through the
backend and are trusted at creation. Migration `20260910130030_remove_psychiatrist_approval_state.sql`
removed the unnecessary approval enum, columns, index, and transition function, and changed clinician
gating to use `is_active`. The Phase 2 test verifies inactive clinicians are hidden and cannot be
booked, while existing assigned access remains relationship-scoped.

## Final note-history decision

Patients are not allowed to see previous note versions. The protected read function returns a
patient's own note only when it is the latest released version. Corrections create separate retained
rows for clinical and audit history, but superseded note bodies are never returned to patients. Assigned
psychiatrists can access the notes they are authorized to access through the protected function.

Admins can read `audit_events` metadata to verify successful and denied note reads. The audit log does
not contain clinical-note content, and admins have no direct or function-based note-content read path.
The final migration also replaced the overlapping audit SELECT policies with one admin-only policy and
added an index for `session_notes.supersedes_note_id`.

## Verification

Phase 2 is officially closed as an as-built foundation. Patients can read only the latest released
version of their own note; superseded note bodies remain protected. Admins can review audit metadata
proving note reads, including denied attempts, but cannot read clinical-note content. No patient
note-history/list endpoint is added. Consent capture/persistence remains the Phase 2 deferred item
and is recorded with the Phase 0 and Phase 1 deferrals in
[deferredpostdevelopment.md](../engineering/phases/deferredpostdevelopment.md).

Passed locally:

- JavaScript syntax checks for changed scripts
- ESLint
- Unit tests: 6 passed
- Vite production build
- `git diff --check`
- Live `npm run test:db:phase2`: passed
- Remote migration history: local and linked migrations synchronized through
  `20260910135532_phase2_audit_policy_and_note_correction_index.sql`
- Supabase advisors: the overlapping audit-policy warning is resolved; remaining warnings are existing
  Auth settings, an intentional protected function exposure, and informational unused-index notices
  from the small synthetic project.

The local Supabase lint/catalog step remains unavailable because this environment has no Docker or
Postgres runtime. The migration is applied to the linked non-production project; no production
project was targeted.
