# Phase 12 — Multi-Factor Authentication and Privileged Access

## Outcome

All privileged accounts use an additional login check, such as an authenticator-app code, before
they can access Orion. The requirement is enforced by the identity provider and verified end to end;
it is not merely a frontend prompt.

This phase is separate from Phases 0–6 and does not change their scope. It follows the frontend demo
work (Phases 7–11) and must be complete before a real-user pilot.

## Scope

- Company owners decide which roles require MFA. The recommended minimum is psychiatrist, secretary,
  and admin; patients are excluded unless owners decide otherwise.
- Configure enrollment, challenge, recovery, and loss-of-device handling for the selected roles.
- Require MFA during privileged sign-in and prevent bypass through password recovery, invitation links,
  role changes, or manipulated client state.
- Record enrollment, challenge, success, failure, reset, and disable events in the existing audit model.
- Test enabled and denied paths for every role, including a copied link, expired session, recovery flow,
  and an account that has not enrolled.
- Document support and offboarding steps without exposing secrets or clinical content.

## Dependencies

- Phase 3 identity implementation and Phase 2 profiles/RLS must exist as-built.
- The owners must record the MFA role decision in the [pilot decision register](../../product/pilot-decision-register.md).
- Phase 6 release approval remains required; this phase does not authorize real users by itself.

## Gate

The selected roles cannot complete privileged sign-in without the second factor; recovery and
offboarding cannot remove that protection without an audited, owner-approved process; and the full
role-by-role verification matrix passes.

## Owner decision

The register currently records MFA as deferred for later discussion. Before this phase starts, move
that decision into the register's owner decision table with the selected roles, required launch date,
and named approver.
