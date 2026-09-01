# Audit Trail

This folder contains dated records of completed audits and implementation passes. Audit entries are historical evidence, not permission to expand scope or a replacement for the active guidance in the parent Knowledge-base documents.

## Entries

| Entry | Covers |
| --- | --- |
| [2026-08-26 React UX implementation audit](2026-08-26-orion-react-ux-audit-entry.md) | Frontend readability, navigation, theme, privacy controls, and the remaining mock-data limitations. |
| [2026-08-27 production readiness foundation audit](2026-08-27-production-readiness-foundation-audit.md) | Why the prototype cannot accept real users yet and the required production gates. |
| [2026-08-28 Supabase demo foundation audit](2026-08-28-supabase-demo-foundation-audit.md) | Orion-scoped Supabase setup, applied schema/RLS migrations, verification, and the remaining demo implementation work. |
| [2026-08-29 synthetic demo-account provisioning audit](2026-08-29-synthetic-demo-account-provisioning-audit.md) | Synthetic Auth-account seed, server-side role/availability verification, and the remaining React identity work. |
| [2026-08-30 real demo identity audit](2026-08-30-real-demo-identity-audit.md) | Supabase Auth integration, server-held role navigation, and the retired mock-auth boundary. |
| [2026-08-30 role-navigation simplification audit](2026-08-30-role-navigation-simplification-audit.md) | Consolidated role navigation, protected-route metadata, and UI ability subjects. |
| [2026-08-31 D4 patient cancellation implementation](2026-08-31-d4-patient-cancellation-implementation-audit.md) | Server-authoritative patient cancellation boundary, UI confirmation, idempotency, and verification limits. |
| [2026-09-01 D5 JaaS synthetic-demo video implementation](2026-09-01-d5-jaas-demo-video-implementation-audit.md) | JaaS access authorization, participant JWT boundary, protected meeting UI, containment controls, and pending provider/manual verification. |
| [2026-09-01 D5 JaaS deployment and early-join update](2026-09-01-d5-jaas-demo-video-deployment-and-early-join-audit.md) | Server-secret configuration, deployed JWT-protected function, 15-minute early-join correction, and remaining D5 closure evidence. |

Read an audit when you need to understand why an existing UI or file looks the way it does, what was already verified, or which limitations remain open. When an audit conflicts with current product scope or architecture, the current parent document wins.

## Deferred simplifications ledger

Record an intentional simplification deferral here when a scoped delivery need prevents immediate cleanup. Each item must include the date, affected area, reason, removal or consolidation target, and verification needed before closure.

| Date | Area | Deferred simplification | Reason | Close when |
| --- | --- | --- | --- | --- |
| 2026-08-26 | Booking routes | Consolidate `DoctorAvailability.jsx` and `PatientAppointment.jsx` into one database-backed patient booking workflow. | Existing UI audit intentionally did not change backend behavior. | Slice 2 booking flow is live, duplicate route is removed, and booking conflict tests pass. |
| 2026-08-26 | Authentication/API | Remove mock email-derived roles, Redux-persisted tokens, and duplicate Axios clients. | The current project is a frontend prototype awaiting Supabase integration. | Slice 1 uses Supabase Auth, route guards, RLS, and one Supabase client. |

Do not use this ledger to justify permanent shortcuts. Resolve an entry in its planned delivery slice, then replace it with a dated closure note in the relevant audit entry.
