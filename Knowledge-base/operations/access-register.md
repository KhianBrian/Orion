# Orion Access Register

**Status:** Draft — complete, review, and date before closing Phase 1.

**Purpose:** Record access by environment and privilege so that access is intentional, least-privilege,
reviewable, and revocable. This document must contain identities and permission levels, never passwords,
service keys, private keys, recovery codes, or copied credentials.

## Environment boundary

| Environment | Intended data | Provisioning state | Access rule |
| --- | --- | --- | --- |
| Test | Synthetic, ephemeral | CI-created as needed | CI service identity only during a run |
| Staging | Synthetic | Existing non-production Supabase project | Named developers and CI only, least privilege |
| Production | Real data only after approval | Not provisioned | Blocked until the legal/DPO and vendor decisions are recorded; privileged access requires MFA |

## Register

| Principal or team | Surface | Environment | Permission level | Authentication/MFA | Owner | Last reviewed | Removal evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Record named identity | Git repository | All | Read / write / admin | Record approved method | Record owner | YYYY-MM-DD | Link to review or offboarding record |
| CI service identity | Repository CI | Test / staging | Minimum required deploy and test permissions | Short-lived or platform-managed credential | Engineering owner | YYYY-MM-DD | Link to rotation or revocation record |
| Record named identity | Supabase dashboard | Staging | Minimum required project role | Record approved method | Supabase owner | YYYY-MM-DD | Link to review or offboarding record |
| No production identity yet | Supabase production | Production | Not provisioned | MFA required before provisioning | Company owner | Not applicable | Not applicable |

## Review procedure

1. Export or inspect current repository, CI, hosting, Supabase, and secret-manager members.
2. Replace each placeholder with a named identity, role, environment, owner, and review date.
3. Remove stale members and rotate any credential whose exposure or ownership is uncertain.
4. Confirm service-role and provider credentials are unavailable to browser code and untrusted CI steps.
5. Have the accountable owner approve the completed table and attach the evidence to the Phase 1 audit.

## Current decision boundary

Production provisioning is intentionally absent. Q2 (legal entity/DPO) and Q9 (vendor/data-transfer
terms) remain prerequisites for production accounts and real data. Completing this register for the
non-production environments does not authorise production use.
