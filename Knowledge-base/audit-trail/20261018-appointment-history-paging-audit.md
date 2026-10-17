# 18 October 2026 Appointment History Paging Audit

## Verdict

The appointments page and both account home dashboards no longer load a person's whole appointment
history. The database now filters and pages the history, and the browser asks for one page at a time.
This is a performance and usability change for synthetic non-production data. It is not a real-user
launch approval and does not change who may see which appointment.

## What changed

- **Migration** `supabase/migrations/20261017110000_appointment_history_paging.sql`, applied to the Orion
  demo project on 17 October 2026 (it was the only pending migration in the dry run):
  - `get_my_upcoming_appointments()`: booked appointments that have not ended, soonest first.
  - `get_my_appointment_counts()`: the caller's upcoming and history counts for the tab badges.
  - `get_my_appointment_history_page(...)`: history, newest first, filtered by name, Manila date range and
    status, with a keyset cursor (`starts_at`, `id`), 25 rows by default and at most 100.
  - All three are `security definer`, resolve the caller from `auth.uid()` only, are revoked from `public`
    and `anon`, and are granted to `authenticated`. A patient sees their own appointments; a psychiatrist
    sees appointments assigned to them; any other role gets no rows.
  - `get_my_appointments_detailed` and `get_admin_appointments` are unchanged.
- **Appointments page:** compact one-line history rows grouped by month, patient/psychiatrist name search
  (debounced 300 ms), time-frame presets and custom range, status chips, a result counter and a Show more
  control. Upcoming and the tab counts use their own small queries. Search text lives only in component
  state and the in-memory query cache; it is never placed in the URL, storage or logs.
- **Account home:** the patient dashboard reads the next appointment from the upcoming function and the
  Care journal (four latest completed sessions plus the total) from a four-row history page. The
  psychiatrist dashboard reads upcoming sessions from the upcoming function and keeps sessions that ended
  today but still await an outcome on today's list, as before.
- **Related interface work shipped the same day (PR 2):** availability page redesign with a seven-day date
  strip, pill buttons and softer cards app-wide, hover colours for the outcome buttons (green for
  completed, red for no-show), and the self-hosted Source Sans 3 and Source Serif 4 fonts (OFL-1.1) in place
  of Inter, Outfit and the Avenir fallback. The two lazy-loaded views keep the initial bundle under its
  180 kB gzipped budget.

## Design notes

- Each function resolves the caller to one patient or psychiatrist first, so the existing indexes
  `appointments_patient_starts_at_idx` and `appointments_psychiatrist_starts_at_idx` serve the lookup. No
  new index was added.
- The date filter is a range on `starts_at` (Asia/Manila, inclusive at both ends) so it stays indexable.
  LIKE wildcards typed into the search box are escaped and matched literally.
- Name search is a substring match over the rows already narrowed to one person. If one account ever
  holds tens of thousands of appointments, add a `pg_trgm` index on the name columns.

## Verification

- Database: `npm run test:db:appointment-history` passed against the demo project (paging with no repeats
  or gaps, status, single-day and name filters, wildcard escaping, half-cursor refusal, patient and
  psychiatrist isolation, admin and anonymous denial, counts agreeing with the lists). `npm run test:db:rls`
  passed.
- Unit: 25 of 25 passed. `npm run lint` clean.
- Browser: the new `a psychiatrist can page, filter and search a long appointment history` test passed on
  desktop and mobile. The full authenticated run was 88 passed, 2 skipped and 2 failed; both failures were
  the administrative support-ticket test in the parallel run, and `support.spec.js` then passed 14 of 14
  on its own, so they are shared-demo-data interference, not a regression from this change.
- Vercel production deployment for the merge was Ready. `npm run build` was not run locally.

## Open items

- The migration SQL could not be run locally (no Docker image available); it was validated directly on the
  demo project through the database test above. No `EXPLAIN` was run at realistic data volumes.
- `get_admin_appointments` still returns every appointment for the administrator list.
- Production data volumes, retention and real-user launch gates remain separate decisions.
