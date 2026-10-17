import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { emptyFilters, filterHistory, groupByMonth, hasActiveFilters, PAGE_SIZE, rangePresets } from "../historyFilters";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import "./AppointmentHistory.css";
import "./outcome-actions.css";

const dayLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short", day: "numeric", month: "short" });
const timeLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", hour12: true });
const statusOptions = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no_show", label: "No show" },
  { id: "booked", label: "Awaiting outcome" },
];

export function AppointmentHistory({ appointments, isPatient, now, noteIds, onOutcome, onNote }) {
  // Filters live only in component state: search text can contain a patient name, so it never goes into the URL or storage.
  const [filters, setFilters] = useState(emptyFilters);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const update = (patch) => { setFilters((current) => ({ ...current, ...patch })); setVisible(PAGE_SIZE); };
  const results = useMemo(() => filterHistory(appointments, filters), [appointments, filters]);
  const shown = results.slice(0, visible);
  const groups = groupByMonth(shown);
  const personLabel = isPatient ? "psychiatrist" : "patient";

  return <div className="history">
    <div className="history-filters" role="search" aria-label="Filter appointment history">
      <label className="history-filters__search"><span className="history-filters__label">Search by {personLabel}</span>
        <input type="search" autoComplete="off" placeholder={`Search ${personLabel} name`} value={filters.search} onChange={(event) => update({ search: event.target.value })} />
      </label>
      <label className="history-filters__range"><span className="history-filters__label">Time frame</span>
        <select value={filters.range} onChange={(event) => update({ range: event.target.value })}>{rangePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
      </label>
      {filters.range === "custom" && <>
        <label><span className="history-filters__label">From</span><input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update({ from: event.target.value })} /></label>
        <label><span className="history-filters__label">To</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update({ to: event.target.value })} /></label>
      </>}
      <div className="history-filters__chips" role="group" aria-label="Status">{statusOptions.map((option) => <button type="button" key={option.id} className={`history-chip${filters.status === option.id ? " history-chip--active" : ""}`} aria-pressed={filters.status === option.id} onClick={() => update({ status: option.id })}>{option.label}</button>)}</div>
    </div>
    <p className="history-summary" role="status">{results.length === appointments.length ? `${results.length} appointments` : `${results.length} of ${appointments.length} appointments`}{hasActiveFilters(filters) && <> · <button type="button" className="history-summary__clear" onClick={() => update(emptyFilters())}>Clear filters</button></>}</p>
    {results.length === 0 && <p className="appointment-list__empty">{appointments.length ? "No appointments match these filters." : "No appointment history yet."}</p>}
    {groups.map((group) => <section key={group.key} className="history-group" aria-label={group.label}>
      <h3 className="history-group__title">{group.label}</h3>
      <div className="history-rows">{group.items.map((appointment) => {
        const needsOutcome = !isPatient && appointment.status === "booked" && new Date(now).getTime() >= new Date(appointment.starts_at).getTime();
        const noteButton = ((!isPatient && (appointment.status === "booked" || appointment.status === "completed")) || (isPatient && noteIds.has(appointment.id)));
        return <article className="history-row" key={appointment.id} data-testid={`appointment-card-${appointment.id}`}>
          <div className="history-row__when"><strong>{dayLabel.format(new Date(appointment.starts_at))}</strong><span>{timeLabel.format(new Date(appointment.starts_at))}</span></div>
          <div className="history-row__who"><h4>{appointment.counterpart_display_name || (isPatient ? "Assigned psychiatrist" : "Assigned patient")}</h4>
            {(appointment.rescheduled_from_id || appointment.replacement_appointment_id) && <span className="history-row__link">{appointment.rescheduled_from_id ? "Replaces an earlier appointment" : "Replacement linked"}</span>}
          </div>
          <AppointmentStatusBadge status={appointment.status} />
          <div className="history-row__actions">
            {needsOutcome && <><Button variant="secondary" className="outcome-action--complete" onClick={() => onOutcome(appointment, "completed")}>Mark completed</Button><Button variant="secondary" className="outcome-action--no-show" onClick={() => onOutcome(appointment, "no_show")}>Record no-show</Button></>}
            {noteButton && <Button variant="quiet" onClick={() => onNote(appointment)}>Session note</Button>}
          </div>
        </article>;
      })}</div>
    </section>)}
    {results.length > shown.length && <div className="history-more"><Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, results.length - shown.length)} more</Button></div>}
  </div>;
}
