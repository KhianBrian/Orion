ORION — SESSION HANDOVER
Written 27 August 2026. Paste this into a new chat to continue.

===============================================================================
WHO AND WHAT
===============================================================================

You are assisting Brian (Khian), the developer on Orion — a browser-based
psychiatry booking platform being prepared for a controlled real-market pilot in
the Philippines. The current source is a prototype: mocked auth, local
persistence, public Jitsi, and hardcoded appointment data. None of that is a
production pattern.

Working directory: /Users/khiansismundo/Downloads/Orion

Read these before doing anything:
  1. Orion_React_App/CLAUDE.md        — app-level rules (mirrors agent.md; keep both in sync)
  2. Knowledge-base/README.md          — authority order; the KB overrides code
  3. Knowledge-base/engineering/phases/README.md — plan index, two-tier rule, prompt contract
  4. Knowledge-base/product/pilot-decision-register.md — every owner decision and what is still open

VERIFY, DO NOT TRUST THIS FILE. It reflects state as at 27 August 2026. Read the
actual documents; do not treat this summary as ground truth.

===============================================================================
WORKING METHOD AGREED WITH BRIAN
===============================================================================

Planning and implementation are split by model:
  - Fable writes the Tier 2 implementation plans into Knowledge-base/engineering/phases/*.md
  - Opus implements against those plans

Two-tier planning: every phase file has a stable Charter (already written) and a
Tier 2 implementation plan written just-in-time, only once the preceding phase's
gate has closed, grounded in what was actually built rather than what the
previous plan intended.

After a phase gate closes, add a dated as-built entry to
Knowledge-base/audit-trail/. The next phase's plan is written from that entry.

PROMPT CONTRACT — full version in phases/README.md. Non-negotiable:
  1. Cite the KB document behind every requirement. No citation = invention.
  2. Never fill a policy gap. Clinical, privacy, legal, retention, vendor and
     emergency policy are owner decisions. State the gap and stop.
  3. Every plan carries an "Inputs I did not have" section.
  4. Verify against live state — read the file, query the database. The plan is a
     proposal; the live system is ground truth.
  5. Respect gate order. No work scheduled behind an unclosed gate.
  6. Synthetic data only in all tests and non-production environments.

===============================================================================
DECIDED — 27 AUGUST 2026 OWNER REVIEW
===============================================================================

Q1  Public patient registration at initial launch, BUT the first launch remains a
    controlled pilot with the number of active patients CAPPED. Psychiatrist and
    secretary accounts are invite/provision-only. Cap value, mechanism
    (waitlist / approval queue / hard limit) and geography NOT set.

Q3  A psychiatrist approval period before becoming bookable is confirmed.
    The approver and the verification criteria are NOT decided.

Q4  Adults only. Orion is NOT emergency care. Approved local crisis and referral
    route is displayed.

Q5  Full appointment transitions decided — authoritative text is in
    Knowledge-base/product/appointment-lifecycle.md § Approved transitions:
      - 45-minute sessions; patient cancellation only beyond 24 hours
      - Psychiatrist self-service cancellation only beyond 48 hours
      - Inside 48 hours: coordinator (secretary or admin) executes on their
        behalf with a mandatory reason + audit event. REQUIRED, not optional —
        otherwise a phoned-in cancellation leaves the appointment booked
      - Reschedule = linked cancel-and-rebook in one transaction, patient-
        initiated, 24-hour boundary. NO new canonical state
      - No-show set by the psychiatrist after a grace period, NEVER automatic
      - Patient-cancelled slots reopen; psychiatrist-cancelled slots do not
      - A cancellation must STORE which party cancelled (reopening depends on it)
    AWAITING RATIFICATION. Ratify before Phase 4 is built, not after.

Q6  SESSION NOTES ARE IN SCOPE. This was the biggest change — Orion now holds
    clinical content, not just scheduling metadata.
      - Written by the psychiatrist after each session
      - Psychiatrist RELEASES the note; patient can read it only after release
      - Secretary NEVER sees notes (an explicit RLS deny, must be tested)
      - Note READS are audited, not just writes
      - Still prohibited: diagnoses, prescriptions, medication, recordings,
        transcripts, reason-for-visit, chat, file uploads
      - "No diagnoses" is NOT enforceable — the note body is free text. Control
        is clinical guidance, not a constraint. Do not claim the schema prevents it

Q7  Three separate versioned consents — privacy acknowledgement, informed consent,
    optional communications. Each independently withdrawable. Scope now covers
    session notes. Wording still to be drafted.

Q8  DEMO: Daily preferred, public Jitsi permitted as a demo-only fallback in a
    clearly labelled internal fake-data mode with synthetic accounts. The label
    must be unmissable and not disableable from the client.
    REAL LAUNCH: provider decision DEFERRED by the owners.
    Public Jitsi is never a fallback for a real client call.

Q10 A SECRETARY ROLE was added — fourth role. Appointments and contact details
    only, never session notes. First-line support tier.
    Stop authority, support hours, incident communication and clinical escalation
    contact are NOT decided.

Q11 Retention to follow the suggested schedule benchmarked against comparable
    clinics. Values NOT set. Now covers session notes as clinical records, which
    may carry a PRESCRIBED minimum rather than a chosen period.

Q12 Company owners give final go/no-go. The five-account synthetic demo is
    showcased to them first.

Q2, Q9  DEFERRED by the owners (legal entity + DPO; vendor and data-transfer
    terms). Fine for planning and the demo. Both become hard blockers before any
    real personal data is processed — more so now that health information is in
    scope.

===============================================================================
PHASE STATUS
===============================================================================

PLANNABLE NOW (6 of 9):
  demo-milestone.md   — IMMEDIATE PRIORITY. Five synthetic accounts, showcased
                        to owners before any real-user decision
  phase-0-governance  — in progress; 7 of 12 register questions answered
  phase-1-baseline    — non-production scope only (Q2/Q9 deferred)
  phase-2-data-rbac   — only Q11 retention stays provisional
  phase-3-identity    — no longer decision-blocked; waits on Phase 2 as-built
  phase-4-scheduling  — state machine settled; four values carried as named gaps

BLOCKED:
  phase-5-video       — Q8 real-launch provider deferred
  phase-6-operations  — Q10 stop authority, Q11 retention, Q1 cap value

===============================================================================
TWO UNRESOLVED DEPENDENCIES THAT CONSTRAIN PHASE 2
===============================================================================

1. SESSION NOTES HAVE NO RETENTION PERIOD.
   The data dictionary requires one for every field, so its own rule is currently
   unsatisfiable for notes. Q11 is open and clinical records may carry a
   prescribed minimum. Create the note schema; build NO retention or disposal
   behaviour. Invent no value.

2. DOES A DATA-SUBJECT ACCESS REQUEST OVERRIDE THE NOTE RELEASE STEP?
   A patient could request all their data while a note is written but unreleased.
   If access rights win, the release step is NOT a privacy boundary and Phase 2
   must not treat it as one. Referred to the DPO. Do not assume either way.

===============================================================================
REFERRED ONWARD — DO NOT DECIDE THESE
===============================================================================

CLINICAL LEAD (none appointed yet):
  - Late grace period before a no-show may be set (15 min recommended for their
    consideration)
  - Early join window and session-end treatment
  - Whether a psychiatrist no-show is distinguishable from a patient no-show.
    Recommendation: one no_show state + absent-party field, not a new state
  - Governance of patient-visible session notes
  - CONFLICT: the owners said "clinical emergency won't happen". This contradicts
    the approved Q4 crisis path. Engineering proceeds with Q4 — the crisis path
    STAYS IN — and Phase 6 keeps a clinical-escalation exercise. Not a
    determination engineering may make.
  - NOTE: production-service-charter.md assigns no-show policy to clinical
    leadership, so the Q5 no-show mechanism needs CLINICAL ratification, not just
    owner sign-off.

COMPANY OWNERS (next meeting):
  - Ratify the Q5 transitions. NOTE: the no-show mechanism also needs a CLINICAL
    ratification — production-service-charter.md assigns no-show policy to
    clinical leadership, not to the owners
  - Q7 wording: privacy notice, telepsychiatry informed consent, and optional-
    communications text. Structure is approved; text is not drafted. Must now
    cover session notes and who can and cannot see them
  - Phase 0 drafts awaiting approval: retention schedule, emergency and referral
    routing content, vendor comparison
  - Whether the secretary, the admin, or either executes a late cancellation
  - Consequences of a no-show (forfeiture, fee treatment, whether it counts
    against a patient)
  - Cap value, mechanism, approved geography, operational review cadence
  - Whether the demo account set expands to six to include a secretary, and
    whether session notes appear in the demo at all
  - Secretary detail: per-psychiatrist or clinic-wide; may they book or cancel on
    a client's behalf; may they see that a note exists without opening it
  - Q2 entity + DPO, Q9 vendor terms, Q8 real-launch provider

DPO / LEGAL (none appointed yet) — five questions in
Knowledge-base/governance/privacy-governance.md § Questions for the DPO.

===============================================================================
DOCUMENTS UPDATED 27 AUGUST 2026 — ALREADY RECONCILED, DO NOT REDO
===============================================================================

  product/pilot-decision-register.md        all 12 decisions + outstanding sections
  product/appointment-lifecycle.md          new § Approved transitions
  product/product-scope.md                  notes, secretary, capped registration
  product/production-service-charter.md     boundary, demo Jitsi, pilot constraints
  governance/data-classification-...md      notes as highest-sensitivity + reader matrix
  governance/privacy-governance.md          clinical-content section + DPO questions
  engineering/phases/*.md                   all 9 files reflect the above

===============================================================================
KNOWN LOOSE ENDS
===============================================================================

  - Knowledge-base/engineering/delivery-plan.md and Knowledge-base/README.md do
    NOT link to the phases/ folder. It is currently orphaned. Two one-line
    additions would fix it. Brian has been asked twice; not yet actioned.
  - Orion_React_App/agent.md and CLAUDE.md are duplicates by design. Edit both.

===============================================================================
SUGGESTED NEXT STEP
===============================================================================

Brian's pick between:
  (a) Hand the six plannable phase files to Fable for Tier 2 implementation
      plans, starting with demo-milestone.md (the immediate priority) or
      phase-0-governance.md (produces the owner meeting pack, which unblocks the
      most downstream work).
  (b) Push for Q11 retention first — the last decision holding Phase 2 back.

Ask Brian which before starting.

===============================================================================
HOUSE RULES FROM BRIAN
===============================================================================

  - Run the plan past Brian BEFORE making any change. Describe file and why. Wait.
  - Never commit or push unless Brian explicitly says so. Approving an edit is
    not approving a commit.
  - Always follow a technical explanation with a plain-English version — no
    jargon, no file paths — without being asked.
  - Never assume. Verify against current state every time.
