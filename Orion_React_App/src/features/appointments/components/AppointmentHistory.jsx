import { useEffect, useState } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { emptyFilters, groupByMonth, hasActiveFilters, historyQueryArgs, PAGE_SIZE, rangePresets } from "../historyFilters";
import { fetchHistoryPage, historyQueryKey } from "../queries";
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

export function AppointmentHistory({ profileId, overallCount, isPatient, now, noteIds, onOutcome, onNote }) {
  // Filters live only in component state: search text can contain a patient name, so it never goes into the URL or storage.
  const [filters, setFilters] = useState(emptyFilters);
  const [searchTerm, setSearchTerm] = useState("");
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));
  // Wait for a pause in typing before asking the database, so each keystroke is not a query.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(filters.search), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);
  const args = historyQueryArgs({ ...filters, search: searchTerm });
  const query = useInfiniteQuery({
    queryKey: historyQueryKey(profileId, args),
    queryFn: ({ pageParam }) => fetchHistoryPage({ args, cursor: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: null,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.rows.length, 0);
      const lastRow = lastPage.rows[lastPage.rows.length - 1];
      return lastRow && loaded < allPages[0].total ? { startsAt: lastRow.starts_at, id: lastRow.id } : undefined;
    },
    placeholderData: keepPreviousData,
  });
  const rows = query.data ? query.data.pages.flatMap((page) => page.rows) : [];
  const total = query.data?.pages[0]?.total ?? 0;
  const groups = groupByMonth(rows);
  const personLabel = isPatient ? "psychiatrist" : "patient";
  const remaining = Math.max(total - rows.length, 0);

  return <div className="history" aria-busy={query.isFetching && !query.isFetchingNextPage}>
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
    <p className="history-summary" role="status">{query.isPending ? "Loading history…" : total === overallCount || !hasActiveFilters(filters) ? `${total} appointments` : `${total} of ${overallCount} appointments`}{hasActiveFilters(filters) && <> · <button type="button" className="history-summary__clear" onClick={() => { setSearchTerm(""); update(emptyFilters()); }}>Clear filters</button></>}</p>
    {query.error && <p className="appointment-list__empty">History could not be loaded. <button type="button" className="history-summary__clear" onClick={() => query.refetch()}>Try again</button></p>}
    {!query.isPending && !query.error && rows.length === 0 && <p className="appointment-list__empty">{hasActiveFilters(filters) ? "No appointments match these filters." : "No appointment history yet."}</p>}
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
    {query.hasNextPage && <div className="history-more"><Button variant="secondary" busy={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Show {Math.min(PAGE_SIZE, remaining)} more</Button></div>}
  </div>;
}
